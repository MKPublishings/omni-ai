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
import type { SimulationInitRequest, SimulationStepRequest } from '../types/simulation.types';

export class SimulationWorker {
  private db: D1Database;
  private runtime: SimulationRuntime;
  private eventBus: EventBus;

  constructor(db: D1Database, eventBus: EventBus) {
    this.db = db;
    this.runtime = new SimulationRuntime(db, eventBus);
    this.eventBus = eventBus;
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

      await this.eventBus.emit('simulation.initialized', 'simulation-worker', {
        simulationId: id,
        mode: body.mode,
      });

      return Response.json(
        {
          simulationId: id,
          mode: body.mode,
          status: 'initializing',
          createdAt: now,
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

      const loaded = await this.runtime.loadState(body.simulationId);
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
      const result = await this.runtime.step(body.simulationId, currentState);
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

      const success = await this.runtime.terminate(body.simulationId);

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

      const loaded = await this.runtime.loadState(id);
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

      const state = await this.runtime.rollback(body.simulationId, body.toStep);
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

  /**
   * WebSocket handler for /api/simulation/stream
   * Upgrades connection and streams simulation state updates
   * TODO: Implement WebSocket upgrade in main worker.ts
   */
  async handleWebSocket(webSocket: WebSocket, simulationId: string): Promise<void> {
    // Stub: send initial state and step updates
    try {
      const loaded = await this.runtime.loadState(simulationId);
      if (!loaded) {
        webSocket.send(JSON.stringify({ error: 'Simulation not found' }));
        webSocket.close(1000);
        return;
      }

      // Send initial state
      webSocket.send(
        JSON.stringify({
          type: 'state',
          data: loaded.snapshot ? JSON.parse(loaded.snapshot.stateBlog) : null,
        })
      );

      // TODO: Listen for step events via EventBus and push updates
    } catch (err) {
      console.error('[SimulationWorker.handleWebSocket]', err);
      webSocket.close(1011);
    }
  }
}
