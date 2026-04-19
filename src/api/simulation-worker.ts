/**
 * @module SimulationWorker
 * @spec: environment-mode, cosmic-mode, multiverse-mode
 * 
 * Handles /api/simulation/* routes and WebSocket upgrade for streaming.
 * Manages simulation lifecycle: init → step → complete/terminate.
 */

import type { RouteParams } from '../router';
import { SimulationRuntime } from '../engines/simulation-runtime';
import { EventBus } from '../engines/event-bus';
import type { SimulationInitRequest, SimulationState, SimulationStepRequest } from '../types/simulation.types';

type SimulationStreamOptions = {
  sessionId: string;
  pollIntervalMs?: number;
};

type SimulationSocketLike = Pick<WebSocket, 'send' | 'close'> & {
  addEventListener?: (type: string, listener: (...args: unknown[]) => void) => void;
};

export class SimulationWorker {
  private db: D1Database;
  private runtime: SimulationRuntime;
  private eventBus: EventBus;
  private static readonly DEFAULT_STREAM_POLL_MS = 1500;

  constructor(db: D1Database, eventBus: EventBus) {
    this.db = db;
    this.runtime = new SimulationRuntime(db, eventBus);
    this.eventBus = eventBus;
  }

  private getRuntimeOptions(env: any): { bridgeEndpoint?: string; bridgeApiKey?: string } {
    return {
      bridgeEndpoint: typeof env?.WORLD_KERNEL_BRIDGE_URL === 'string' ? env.WORLD_KERNEL_BRIDGE_URL : undefined,
      bridgeApiKey: typeof env?.WORLD_KERNEL_BRIDGE_TOKEN === 'string' ? env.WORLD_KERNEL_BRIDGE_TOKEN : undefined,
    };
  }

  /**
   * POST /api/simulation/init — initialize a new simulation run
   */
  async init(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const body = await request.json() as SimulationInitRequest;

      if (!body.mode || !body.config) {
        return new Response(JSON.stringify({ error: 'Missing required fields: mode, config' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await this.db
        .prepare(`
          INSERT INTO simulation_runs (
            id, session_id, mode, config, seed, status,
            current_step, max_steps, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'initializing', 0, ?, ?, ?)
        `)
        .bind(id, sessionId, body.mode, JSON.stringify(body.config), body.seed ?? null, body.maxSteps ?? null, now, now)
        .run();

      const initializedState = await this.runtime.initializeRun(
        {
          id,
          session_id: sessionId,
          mode: body.mode,
          config: JSON.stringify(body.config),
          seed: body.seed ?? null,
          current_step: 0,
        },
        this.getRuntimeOptions(env)
      );

      if (!initializedState) {
        return new Response(JSON.stringify({ error: 'Failed to initialize simulation state' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }

      await this.eventBus.emit('simulation.initialized', 'simulation-worker', {
        simulationId: id,
        mode: body.mode,
      });

      return Response.json(
        {
          simulationId: id,
          mode: body.mode,
          status: 'running',
          createdAt: now,
          state: initializedState,
        },
        { status: 201 }
      );
    } catch (err: unknown) {
      console.error('[SimulationWorker.init]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * POST /api/simulation/step — execute one simulation tick
   */
  async step(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const body = await request.json() as SimulationStepRequest;

      if (!body.simulationId) {
        return new Response(JSON.stringify({ error: 'Missing simulationId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const loaded = await this.runtime.loadState(body.simulationId, sessionId);
      if (!loaded) {
        return new Response(JSON.stringify({ error: 'Simulation not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      // Parse current state from snapshot
      let currentState = loaded.snapshot
        ? JSON.parse(loaded.snapshot.stateBlog)
        : {
            entities: [],
            environment: {},
            rules: [],
            stepNumber: 0,
            timestamp: new Date().toISOString(),
            metadata: {},
          };

      // Execute step
      const result = await this.runtime.step(loaded.runRecord, currentState, {
        ...this.getRuntimeOptions(env),
        stepCount: body.count,
      });
      if (!result) {
        return new Response(JSON.stringify({ error: 'Step execution failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }

      return Response.json({
        step: result.newState.stepNumber,
        state: result.newState,
        delta: result.delta,
        entityCount: result.newState.entities.length,
        memoryKb: Math.ceil(JSON.stringify(result.newState).length / 1024),
      });
    } catch (err: unknown) {
      console.error('[SimulationWorker.step]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * POST /api/simulation/terminate — stop a simulation
   */
  async terminate(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const body = await request.json() as { simulationId: string };

      if (!body.simulationId) {
        return new Response(JSON.stringify({ error: 'Missing simulationId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const success = await this.runtime.terminateForSession(body.simulationId, sessionId);

      if (!success) {
        return new Response(JSON.stringify({ error: 'Terminate failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }

      return Response.json({ status: 'terminated' });
    } catch (err: unknown) {
      console.error('[SimulationWorker.terminate]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * GET /api/simulation/state?id=... — get current simulation state
   */
  async getState(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const url = new URL(request.url);
      const id = url.searchParams.get('id');

      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing id parameter' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const loaded = await this.runtime.loadState(id, sessionId);
      if (!loaded) {
        return new Response(JSON.stringify({ error: 'Simulation not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      const state = loaded.snapshot ? JSON.parse(loaded.snapshot.stateBlog) : null;

      return Response.json({
        simulation: loaded.runRecord,
        latestSnapshot: loaded.snapshot,
        state,
      });
    } catch (err: unknown) {
      console.error('[SimulationWorker.getState]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * GET /api/simulation/snapshot — get specific snapshot
   */
  async getSnapshot(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const url = new URL(request.url);
      const simulationId = url.searchParams.get('id');
      const step = parseInt(url.searchParams.get('step') || '0');

      if (!simulationId) {
        return new Response(JSON.stringify({ error: 'Missing id parameter' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const loaded = await this.runtime.loadState(simulationId, sessionId);
      if (!loaded) {
        return new Response(JSON.stringify({ error: 'Simulation not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      const state = await this.runtime.getStateAtStep(simulationId, step);
      if (!state) {
        return new Response(JSON.stringify({ error: 'Snapshot not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      return Response.json({ snapshot: state });
    } catch (err: unknown) {
      console.error('[SimulationWorker.getSnapshot]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * POST /api/simulation/rollback — rollback to a step
   */
  async rollback(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const body = await request.json() as { simulationId: string; toStep: number };

      if (!body.simulationId || body.toStep === undefined) {
        return new Response(JSON.stringify({ error: 'Missing simulationId or toStep' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const state = await this.runtime.rollbackForSession(body.simulationId, sessionId, body.toStep);
      if (!state) {
        return new Response(JSON.stringify({ error: 'Rollback failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }

      return Response.json({
        currentStep: body.toStep,
        state,
      });
    } catch (err: unknown) {
      console.error('[SimulationWorker.rollback]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * GET /api/simulation/history — past simulation runs
   */
  async history(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const url = new URL(request.url);
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
      const offset = (page - 1) * limit;

      const result = await this.db
        .prepare(
          'SELECT * FROM simulation_runs WHERE session_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
        )
        .bind(sessionId, limit, offset)
        .all<any>();

      const countResult = await this.db
        .prepare('SELECT COUNT(*) as count FROM simulation_runs WHERE session_id = ?')
        .bind(sessionId)
        .first<any>();

      return Response.json({
        runs: result.results || [],
        total: countResult?.count || 0,
        page,
        pageSize: limit,
      });
    } catch (err: unknown) {
      console.error('[SimulationWorker.history]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  private async loadStreamState(simulationId: string, sessionId: string): Promise<{
    runRecord: any;
    state: SimulationState | null;
    snapshot: { step: number; checksum: string; createdAt: string } | null;
  } | null> {
    const loaded = await this.runtime.loadState(simulationId, sessionId);
    if (!loaded) {
      return null;
    }

    const state = loaded.snapshot ? JSON.parse(loaded.snapshot.stateBlog) as SimulationState : null;

    return {
      runRecord: loaded.runRecord,
      state,
      snapshot: loaded.snapshot
        ? {
            step: loaded.snapshot.step,
            checksum: loaded.snapshot.checksum,
            createdAt: loaded.snapshot.createdAt,
          }
        : null,
    };
  }

  private buildStreamFingerprint(payload: {
    runRecord: { status?: string; current_step?: number; updated_at?: string };
    snapshot: { step: number; checksum: string; createdAt: string } | null;
  }): string {
    return [
      String(payload.runRecord.status || 'unknown'),
      String(payload.runRecord.current_step ?? 0),
      String(payload.runRecord.updated_at || ''),
      String(payload.snapshot?.checksum || 'no-checksum'),
      String(payload.snapshot?.step ?? -1),
    ].join(':');
  }

  private async pushStreamState(
    webSocket: SimulationSocketLike,
    simulationId: string,
    sessionId: string,
    lastFingerprint: { value: string | null },
    messageType: 'snapshot' | 'update' = 'update'
  ): Promise<boolean> {
    const payload = await this.loadStreamState(simulationId, sessionId);
    if (!payload) {
      webSocket.send(JSON.stringify({ type: 'error', error: 'Simulation not found' }));
      webSocket.close(1008, 'Simulation not found');
      return false;
    }

    const fingerprint = this.buildStreamFingerprint(payload);
    if (fingerprint === lastFingerprint.value) {
      return true;
    }

    lastFingerprint.value = fingerprint;
    webSocket.send(
      JSON.stringify({
        type: messageType,
        simulationId,
        timestamp: new Date().toISOString(),
        simulation: payload.runRecord,
        snapshot: payload.snapshot,
        state: payload.state,
      })
    );

    const status = String(payload.runRecord.status || '').toLowerCase();
    if (status === 'completed' || status === 'terminated' || status === 'error') {
      webSocket.close(1000, 'Simulation stream complete');
      return false;
    }

    return true;
  }

  /**
   * WebSocket handler for /api/simulation/stream
   * Streams simulation state updates by polling the persisted runtime snapshots.
   */
  async handleWebSocket(webSocket: SimulationSocketLike, simulationId: string, options: SimulationStreamOptions): Promise<void> {
    try {
      let closed = false;
      let intervalHandle: ReturnType<typeof setInterval> | null = null;
      const lastFingerprint = { value: null as string | null };
      const pollIntervalMs = Math.max(50, Math.floor(options.pollIntervalMs || SimulationWorker.DEFAULT_STREAM_POLL_MS));

      const closeStream = () => {
        closed = true;
        if (intervalHandle) {
          clearInterval(intervalHandle);
          intervalHandle = null;
        }
      };

      webSocket.addEventListener?.('close', closeStream);
      webSocket.addEventListener?.('error', closeStream);

      webSocket.send(
        JSON.stringify({
          type: 'connection',
          simulationId,
          pollIntervalMs,
          timestamp: new Date().toISOString(),
        })
      );

      const keepStreaming = await this.pushStreamState(
        webSocket,
        simulationId,
        options.sessionId,
        lastFingerprint,
        'snapshot'
      );
      if (!keepStreaming || closed) {
        closeStream();
        return;
      }

      intervalHandle = setInterval(() => {
        if (closed) {
          closeStream();
          return;
        }

        void this.pushStreamState(webSocket, simulationId, options.sessionId, lastFingerprint).then((shouldContinue) => {
          if (!shouldContinue) {
            closeStream();
          }
        }).catch((err) => {
          console.error('[SimulationWorker.handleWebSocket.poll]', err);
          closeStream();
          webSocket.close(1011, 'Simulation stream failure');
        });
      }, pollIntervalMs);
    } catch (err) {
      console.error('[SimulationWorker.handleWebSocket]', err);
      webSocket.close(1011);
    }
  }
}
