/**
 * @module SimulationRuntime
 * @spec: environment-mode, cosmic-mode, multiverse-mode
 * 
 * Simulation tick engine, state management, and snapshot creation.
 * Manages the simulation lifecycle: init → step → complete/terminate.
 * Persists state to D1 and snapshots for rollback support.
 */

import { MultiverseEngine } from '../modes/multiverse/multiverse_engine';
import type { LodLevel, MultiverseQuery } from '../modes/multiverse/multiverse_schema';
import {
  SimulationEngine,
  summarizeWorld,
  type ExternalSimulationInput,
  type SimulationWorldSnapshot,
} from '../simulation';
import type { SimulationDelta, SimulationState } from '../types/simulation.types';
import { createSimulationBridge } from '../world/simulation-bridge';
import { InMemoryWorldStateBus } from '../world/state-bus';
import type { WorldAgentState, WorldEventEnvelope, WorldStateSnapshot } from '../world/types';
import { SovereignWorldKernel } from '../world/kernel';
import { EventBus } from './event-bus';

type RuntimeStepOptions = {
  stepCount?: number;
  bridgeEndpoint?: string;
  bridgeApiKey?: string;
};

type RuntimeInitOptions = {
  bridgeEndpoint?: string;
  bridgeApiKey?: string;
};

type SimulationRunRecord = {
  id: string;
  session_id?: string;
  mode?: string;
  config?: string;
  seed?: string | null;
  current_step?: number;
};

type PersistedSimulationMetadata = Record<string, unknown> & {
  simulationWorld?: SimulationWorldSnapshot;
  multiverse?: {
    lastQuery?: MultiverseQuery;
    lastResult?: Record<string, unknown>;
  };
  sovereignWorld?: {
    snapshot?: WorldStateSnapshot;
    eventLog?: WorldEventEnvelope[];
  };
};

const DEFAULT_SIMULATION_ENGINE = new SimulationEngine();
const MAX_WORLD_EVENT_LOG = 256;

export class SimulationRuntime {
  private db: D1Database;
  private eventBus: EventBus;

  constructor(db: D1Database, eventBus: EventBus) {
    this.db = db;
    this.eventBus = eventBus;
  }

  /**
   * Load current simulation state from DB
   * Returns both the run record and latest snapshot
   */
  async loadState(
    simulationId: string,
    sessionId?: string
  ): Promise<{ runRecord: any; snapshot: SimulationSnapshot | null } | null> {
    try {
      const runRecordQuery = sessionId
        ? this.db.prepare('SELECT * FROM simulation_runs WHERE id = ? AND session_id = ?').bind(simulationId, sessionId)
        : this.db.prepare('SELECT * FROM simulation_runs WHERE id = ?').bind(simulationId);

      const runRecord = await runRecordQuery
        .first();

      if (!runRecord) return null;

      // Get latest snapshot
      const latestSnapshot = await this.db
        .prepare(
          'SELECT * FROM simulation_snapshots WHERE simulation_id = ? ORDER BY step DESC LIMIT 1'
        )
        .bind(simulationId)
        .first<any>();

      return {
        runRecord,
        snapshot: latestSnapshot
          ? {
              id: latestSnapshot.id,
              simulationId: latestSnapshot.simulation_id,
              step: latestSnapshot.step,
              stateBlog: latestSnapshot.state_blob,
              deltaBlog: latestSnapshot.delta_blob,
              checksum: latestSnapshot.checksum,
              createdAt: latestSnapshot.created_at,
            }
          : null,
      };
    } catch (err) {
      console.error('[SimulationRuntime.loadState]', err);
      return null;
    }
  }

  async initializeRun(
    runRecord: SimulationRunRecord,
    options?: RuntimeInitOptions
  ): Promise<SimulationState | null> {
    try {
      const mode = this.normalizeMode(runRecord.mode);
      let state: SimulationState;

      if (mode === 'multiverse') {
        state = await this.createInitialMultiverseState(runRecord);
      } else if (mode === 'cosmic') {
        state = await this.createInitialSovereignWorldState(runRecord, options);
      } else {
        state = this.createInitialSimulationState(runRecord);
      }

      await this.persistSnapshot(runRecord.id, 0, state, this.createDelta(null, state));
      await this.db
        .prepare(
          `UPDATE simulation_runs
           SET status = 'running', current_step = 0, updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(runRecord.id)
        .run();

      await this.eventBus.emit('simulation.initialized', 'simulation-runtime', {
        simulationId: runRecord.id,
        mode,
        entityCount: state.entities.length,
      });

      return state;
    } catch (err) {
      console.error('[SimulationRuntime.initializeRun]', err);
      return null;
    }
  }

  /**
   * Execute one simulation step
   * Applies rules, updates entities, creates snapshot
   */
  async step(
    runRecord: SimulationRunRecord,
    currentState: SimulationState,
    options?: RuntimeStepOptions
  ): Promise<{ newState: SimulationState; delta: SimulationDelta } | null> {
    try {
      const stepCount = Math.max(1, Math.floor(Number(options?.stepCount || 1)));
      const mode = this.normalizeMode(runRecord.mode);
      let newState = this.cloneState(currentState);

      for (let index = 0; index < stepCount; index += 1) {
        if (mode === 'multiverse') {
          newState = await this.advanceMultiverseState(runRecord, newState);
        } else if (mode === 'cosmic') {
          newState = await this.advanceSovereignWorldState(runRecord, newState, options);
        } else {
          newState = this.advanceDeterministicSimulationState(runRecord, newState);
        }
      }

      const delta = this.createDelta(currentState, newState);

      await this.persistSnapshot(runRecord.id, newState.stepNumber, newState, delta);

      await this.db
        .prepare(
          `UPDATE simulation_runs
           SET current_step = ?, updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(newState.stepNumber, runRecord.id)
        .run();

      // Emit event
      await this.eventBus.emit('simulation.stepped', 'simulation-runtime', {
        simulationId: runRecord.id,
        step: newState.stepNumber,
        entityCount: newState.entities.length,
      });

      return { newState, delta };
    } catch (err) {
      console.error('[SimulationRuntime.step]', err);
      return null;
    }
  }

  /**
   * Get the state at a specific step (via snapshot lookup and restore)
   */
  async getStateAtStep(simulationId: string, step: number): Promise<SimulationState | null> {
    try {
      const snapshot = await this.db
        .prepare(
          'SELECT state_blob FROM simulation_snapshots WHERE simulation_id = ? AND step = ?'
        )
        .bind(simulationId, step)
        .first<any>();

      if (!snapshot) return null;

      return JSON.parse(snapshot.state_blob);
    } catch (err) {
      console.error('[SimulationRuntime.getStateAtStep]', err);
      return null;
    }
  }

  /**
   * Rollback to a previous step
   */
  async rollback(simulationId: string, toStep: number): Promise<SimulationState | null> {
    try {
      // Verify step exists
      const state = await this.getStateAtStep(simulationId, toStep);
      if (!state) return null;

      // Delete all snapshots after this step
      await this.db
        .prepare('DELETE FROM simulation_snapshots WHERE simulation_id = ? AND step > ?')
        .bind(simulationId, toStep)
        .run();

      // Update run record
      await this.db
        .prepare(
          `UPDATE simulation_runs
         SET current_step = ?, status = 'running', updated_at = datetime('now')
         WHERE id = ?`
        )
        .bind(toStep, simulationId)
        .run();

      await this.eventBus.emit('simulation.rolledback', 'simulation-runtime', {
        simulationId,
        toStep,
      });

      return state;
    } catch (err) {
      console.error('[SimulationRuntime.rollback]', err);
      return null;
    }
  }

  /**
   * Get all snapshots for a simulation (for history/comparison)
   */
  async getSnapshots(simulationId: string): Promise<
    Array<{
      step: number;
      checksum: string;
      createdAt: string;
    }>
  > {
    try {
      const result = await this.db
        .prepare(
          `SELECT step, checksum, created_at FROM simulation_snapshots
         WHERE simulation_id = ? ORDER BY step ASC`
        )
        .bind(simulationId)
        .all<any>();

      return (result.results || []).map((row: any) => ({
        step: row.step,
        checksum: row.checksum,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('[SimulationRuntime.getSnapshots]', err);
      return [];
    }
  }

  /**
   * Terminate a simulation run
   */
  async terminate(simulationId: string): Promise<boolean> {
    try {
      const result = await this.db
        .prepare(
          `UPDATE simulation_runs
         SET status = 'terminated', completed_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`
        )
        .bind(simulationId)
        .run<any>();

      if (result.meta.changes > 0) {
        await this.eventBus.emit('simulation.terminated', 'simulation-runtime', { simulationId });
        return true;
      }

      return false;
    } catch (err) {
      console.error('[SimulationRuntime.terminate]', err);
      return false;
    }
  }

  async rollbackForSession(simulationId: string, sessionId: string, toStep: number): Promise<SimulationState | null> {
    try {
      const loaded = await this.loadState(simulationId, sessionId);
      if (!loaded) return null;
      return this.rollback(simulationId, toStep);
    } catch (err) {
      console.error('[SimulationRuntime.rollbackForSession]', err);
      return null;
    }
  }

  async terminateForSession(simulationId: string, sessionId: string): Promise<boolean> {
    try {
      const loaded = await this.loadState(simulationId, sessionId);
      if (!loaded) return false;
      return this.terminate(simulationId);
    } catch (err) {
      console.error('[SimulationRuntime.terminateForSession]', err);
      return false;
    }
  }

  /**
   * Compute SHA-256 checksum of state for integrity checking
   */
  private async computeChecksum(data: string): Promise<string> {
    try {
      // Use SubtleCrypto for SHA-256
      const encoder = new TextEncoder();
      const bytes = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);

      // Convert to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback: simple hash
      return `sha256:${Math.random().toString(36).substring(7)}`;
    }
  }

  private normalizeMode(value: unknown): 'environment' | 'cosmic' | 'multiverse' | 'custom' {
    const normalized = String(value || 'environment').toLowerCase();
    if (normalized === 'cosmic' || normalized === 'multiverse' || normalized === 'custom') {
      return normalized;
    }

    return 'environment';
  }

  private parseConfig(runRecord: SimulationRunRecord): Record<string, unknown> {
    if (!runRecord.config) {
      return {};
    }

    if (typeof runRecord.config !== 'string') {
      return (runRecord.config as Record<string, unknown>) || {};
    }

    try {
      return JSON.parse(runRecord.config);
    } catch {
      return {};
    }
  }

  private cloneState(state: SimulationState): SimulationState {
    return JSON.parse(JSON.stringify(state)) as SimulationState;
  }

  private async persistSnapshot(
    simulationId: string,
    step: number,
    state: SimulationState,
    delta: SimulationDelta
  ): Promise<void> {
    const snapshotId = crypto.randomUUID();
    const stateBlob = JSON.stringify(state);
    const deltaBlob = JSON.stringify(delta);
    const checksum = await this.computeChecksum(stateBlob);

    await this.db
      .prepare(`
        INSERT INTO simulation_snapshots (id, simulation_id, step, state_blob, delta_blob, checksum, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `)
      .bind(snapshotId, simulationId, step, stateBlob, deltaBlob, checksum)
      .run();
  }

  private createDelta(previousState: SimulationState | null, nextState: SimulationState): SimulationDelta {
    if (!previousState) {
      return {
        addedEntities: nextState.entities.map((entity) => String((entity as Record<string, unknown>).id || 'entity')),
        modifiedEntities: {},
        removedEntities: [],
        environmentChanges: { ...nextState.environment },
        timestamp: nextState.timestamp,
      };
    }

    const previousEntities = new Map(
      previousState.entities.map((entity) => [String((entity as Record<string, unknown>).id || ''), entity])
    );
    const nextEntities = new Map(
      nextState.entities.map((entity) => [String((entity as Record<string, unknown>).id || ''), entity])
    );

    const addedEntities = [...nextEntities.keys()].filter((id) => id && !previousEntities.has(id));
    const removedEntities = [...previousEntities.keys()].filter((id) => id && !nextEntities.has(id));
    const modifiedEntities: Record<string, unknown> = {};

    for (const [entityId, entity] of nextEntities.entries()) {
      if (!entityId || !previousEntities.has(entityId)) continue;
      const before = JSON.stringify(previousEntities.get(entityId));
      const after = JSON.stringify(entity);
      if (before !== after) {
        modifiedEntities[entityId] = entity;
      }
    }

    const environmentChanges = this.diffRecords(previousState.environment, nextState.environment);

    return {
      addedEntities,
      modifiedEntities,
      removedEntities,
      environmentChanges,
      timestamp: nextState.timestamp,
    };
  }

  private diffRecords(previousRecord: Record<string, unknown>, nextRecord: Record<string, unknown>): Record<string, unknown> {
    const delta: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(previousRecord || {}), ...Object.keys(nextRecord || {})]);

    for (const key of keys) {
      const before = JSON.stringify(previousRecord?.[key]);
      const after = JSON.stringify(nextRecord?.[key]);
      if (before !== after) {
        delta[key] = nextRecord?.[key];
      }
    }

    return delta;
  }

  private parseSeed(runRecord: SimulationRunRecord, config: Record<string, unknown>): bigint {
    const rawSeed = runRecord.seed ?? config.seed;
    const normalized = String(rawSeed ?? '20260419').trim();

    if (/^0x[0-9a-f]+$/i.test(normalized)) {
      return BigInt(normalized);
    }

    if (/^\d+$/.test(normalized)) {
      return BigInt(normalized);
    }

    let hash = 0n;
    for (const char of normalized) {
      hash = (hash * 131n + BigInt(char.charCodeAt(0))) & ((1n << 63n) - 1n);
    }

    return hash || 20260419n;
  }

  private buildSimulationInput(runRecord: SimulationRunRecord, state: SimulationState): ExternalSimulationInput {
    const config = this.parseConfig(runRecord);
    const directives = Array.isArray(config.rules)
      ? config.rules.map((rule) => String(rule)).filter(Boolean)
      : [];

    return {
      userIntent: String(config.intent || `advance ${this.normalizeMode(runRecord.mode)} simulation`),
      directives,
      injectedEvents: Array.isArray(config.injectedEvents)
        ? config.injectedEvents.map((event) => String(event)).filter(Boolean)
        : [],
      mode: this.normalizeMode(runRecord.mode),
    };
  }

  private createInitialSimulationState(runRecord: SimulationRunRecord): SimulationState {
    const config = this.parseConfig(runRecord);
    const world = DEFAULT_SIMULATION_ENGINE.bootstrapWorld({
      rules: Array.isArray(config.rules) ? config.rules.map((rule) => String(rule)) : undefined,
    });

    return this.toDeterministicSimulationState(world.snapshot(), runRecord);
  }

  private advanceDeterministicSimulationState(runRecord: SimulationRunRecord, currentState: SimulationState): SimulationState {
    const metadata = (currentState.metadata || {}) as PersistedSimulationMetadata;
    const world = DEFAULT_SIMULATION_ENGINE.deserialize(metadata.simulationWorld);
    const nextWorld = DEFAULT_SIMULATION_ENGINE.runStep(world, this.buildSimulationInput(runRecord, currentState));
    return this.toDeterministicSimulationState(nextWorld.snapshot(), runRecord);
  }

  private toDeterministicSimulationState(world: SimulationWorldSnapshot, runRecord: SimulationRunRecord): SimulationState {
    return {
      entities: world.agents.map((agent) => ({
        id: agent.id,
        type: 'simulation-agent',
        traits: { ...agent.traits },
        state: { ...agent.state },
        goals: [...agent.goals],
        memory: [...agent.memory],
        lastAction: agent.lastAction || null,
      })),
      environment: {
        ...world.environment,
        mode: this.normalizeMode(runRecord.mode),
        summary: summarizeWorld(world),
      },
      rules: world.environment.rules.map((rule) => ({ value: rule })),
      stepNumber: world.tick,
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'deterministic-simulation-engine',
        simulationWorld: world,
      },
    };
  }

  private async createInitialMultiverseState(runRecord: SimulationRunRecord): Promise<SimulationState> {
    const config = this.parseConfig(runRecord);
    const engine = new MultiverseEngine(this.parseSeed(runRecord, config));
    const query = this.buildMultiverseQuery(config, 0);
    const result = await engine.query(query);
    return this.toMultiverseSimulationState(runRecord, result, 0);
  }

  private async advanceMultiverseState(runRecord: SimulationRunRecord, currentState: SimulationState): Promise<SimulationState> {
    const config = this.parseConfig(runRecord);
    const engine = new MultiverseEngine(this.parseSeed(runRecord, config));
    const nextStep = (currentState.stepNumber || 0) + 1;
    const query = this.buildMultiverseQuery(config, nextStep, (currentState.metadata as PersistedSimulationMetadata)?.multiverse?.lastQuery);
    const result = await engine.query(query);
    return this.toMultiverseSimulationState(runRecord, result, nextStep);
  }

  private buildMultiverseQuery(
    config: Record<string, unknown>,
    stepNumber: number,
    priorQuery?: MultiverseQuery
  ): MultiverseQuery {
    const configured = (config.query || {}) as Record<string, unknown>;
    const coordinates = Array.isArray(configured.coordinates)
      ? configured.coordinates.map((value) => Number(value || 0))
      : priorQuery?.coordinates.values || [0, 0, 0];

    return {
      type: (configured.type as MultiverseQuery['type']) || priorQuery?.type || 'sphere',
      coordinates: {
        system: 'cartesian_mpc',
        values: [
          Number(coordinates[0] || 0) + stepNumber * 0.5,
          Number(coordinates[1] || 0),
          Number(coordinates[2] || 0),
        ],
        radius: Number(configured.radius || priorQuery?.coordinates.radius || 60),
      },
      lodLevel: this.normalizeLodLevel(configured.lodLevel ?? priorQuery?.lodLevel ?? 3),
      maxResults: Number(configured.maxResults || priorQuery?.maxResults || 64),
      includeParentChain: Boolean(configured.includeParentChain || priorQuery?.includeParentChain),
    };
  }

  private normalizeLodLevel(value: unknown): LodLevel {
    const numeric = Math.max(0, Math.min(7, Math.floor(Number(value || 0))));
    return numeric as LodLevel;
  }

  private toMultiverseSimulationState(
    runRecord: SimulationRunRecord,
    result: Awaited<ReturnType<MultiverseEngine['query']>>,
    stepNumber: number
  ): SimulationState {
    return {
      entities: result.entities.map((entity) => ({
        id: entity.id,
        type: entity.entityType,
        seed: entity.seed.toString(),
        position: [...entity.position],
        redshift: entity.redshift,
        lodLevel: entity.lodLevel,
        parentId: entity.parentId,
        properties: { ...entity.properties },
      })),
      environment: {
        mode: 'multiverse',
        lodLevel: result.metadata.lodLevel,
        totalMatches: result.totalMatches,
        returnedCount: result.returnedCount,
        executionTimeMs: result.executionTimeMs,
        cosmologyVersion: result.metadata.cosmologyVersion,
        seedPath: result.metadata.seedPath,
      },
      rules: [
        { value: 'deterministic: true' },
        { value: 'boundedExecution: true' },
        { value: 'cosmologyModel: LCDM-Planck2018' },
      ],
      stepNumber,
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'ionirix-multiverse-engine',
        multiverse: {
          lastQuery: result.query,
          lastResult: {
            executionTimeMs: result.executionTimeMs,
            totalMatches: result.totalMatches,
            returnedCount: result.returnedCount,
            metadata: result.metadata,
          },
        },
      },
    };
  }

  private async createInitialSovereignWorldState(
    runRecord: SimulationRunRecord,
    options?: RuntimeInitOptions
  ): Promise<SimulationState> {
    const config = this.parseConfig(runRecord);
    const kernel = new SovereignWorldKernel(
      new InMemoryWorldStateBus(),
      createSimulationBridge({
        endpoint: options?.bridgeEndpoint,
        apiKey: options?.bridgeApiKey,
      }),
      {
        worldId: String(config.worldId || `simulation-world:${runRecord.id}`),
        mode: String(config.mode || 'sovereign'),
        metadata: { initializedBy: 'simulation-runtime' },
      }
    );

    const initialAgents = this.resolveInitialWorldAgents(config);
    for (const agent of initialAgents) {
      await kernel.execute({ type: 'spawn_agent', agent });
    }

    return this.toSovereignWorldSimulationState(kernel.getSnapshot(), kernel.getEventLog(MAX_WORLD_EVENT_LOG));
  }

  private async advanceSovereignWorldState(
    runRecord: SimulationRunRecord,
    currentState: SimulationState,
    options?: RuntimeStepOptions
  ): Promise<SimulationState> {
    const metadata = (currentState.metadata || {}) as PersistedSimulationMetadata;
    const storedWorld = metadata.sovereignWorld || {};
    const kernel = new SovereignWorldKernel(
      new InMemoryWorldStateBus(),
      createSimulationBridge({
        endpoint: options?.bridgeEndpoint,
        apiKey: options?.bridgeApiKey,
      }),
      {
        worldId: storedWorld.snapshot?.worldId || `simulation-world:${runRecord.id}`,
        initialSnapshot: storedWorld.snapshot,
        initialEvents: storedWorld.eventLog,
        metadata: { resumedBy: 'simulation-runtime' },
      }
    );

    const result = await kernel.execute({
      type: 'advance_tick',
      steps: 1,
      reason: 'simulation-runtime-step',
    });

    return this.toSovereignWorldSimulationState(result.snapshot, kernel.getEventLog(MAX_WORLD_EVENT_LOG));
  }

  private resolveInitialWorldAgents(config: Record<string, unknown>): Array<Omit<WorldAgentState, 'updatedAt'> & { updatedAt?: string }> {
    const configuredAgents = Array.isArray(config.initialAgents)
      ? config.initialAgents.filter((agent) => agent && typeof agent === 'object') as Array<Record<string, unknown>>
      : [];

    if (configuredAgents.length > 0) {
      return configuredAgents.map((agent, index) => ({
        id: String(agent.id || `agent-${index + 1}`),
        kind: String(agent.kind || 'operator'),
        status: agent.status === 'terminated' || agent.status === 'suspended' ? agent.status : 'active',
        metrics: this.normalizeNumericRecord(agent.metrics),
        memory: Array.isArray(agent.memory) ? agent.memory.map((entry) => String(entry)) : [],
        tags: Array.isArray(agent.tags) ? agent.tags.map((entry) => String(entry)) : [],
      }));
    }

    return [
      {
        id: 'operator',
        kind: 'operator',
        status: 'active',
        metrics: { focus: 0.7, coherence: 0.86, resilience: 0.74 },
        memory: ['initial sovereign bootstrap'],
        tags: ['simulation', 'sovereign'],
      },
      {
        id: 'system',
        kind: 'orchestrator',
        status: 'active',
        metrics: { focus: 0.78, coherence: 0.91, resilience: 0.8 },
        memory: ['system continuity'],
        tags: ['kernel', 'stability'],
      },
    ];
  }

  private normalizeNumericRecord(value: unknown): Record<string, number> {
    if (!value || typeof value !== 'object') {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, metricValue]) => [key, Number(metricValue)])
        .filter(([, metricValue]) => Number.isFinite(metricValue))
    );
  }

  private toSovereignWorldSimulationState(
    snapshot: WorldStateSnapshot,
    eventLog: WorldEventEnvelope[]
  ): SimulationState {
    return {
      entities: Object.values(snapshot.agents).map((agent) => ({
        id: agent.id,
        type: agent.kind,
        status: agent.status,
        position: agent.position ? { ...agent.position } : null,
        metrics: { ...agent.metrics },
        memory: [...agent.memory],
        tags: [...agent.tags],
        updatedAt: agent.updatedAt,
      })),
      environment: {
        worldId: snapshot.worldId,
        status: snapshot.status,
        mode: snapshot.environment.mode,
        regions: { ...snapshot.environment.regions },
        signals: { ...snapshot.environment.signals },
        anomalyCount: snapshot.anomalies.length,
        eventCount: eventLog.length,
        version: snapshot.version,
        updatedAt: snapshot.environment.updatedAt,
      },
      rules: [
        { value: 'authoritativeRuntime: sovereign-world-kernel' },
        { value: `bridge: ${String(snapshot.metadata.bridge || 'local-simulation-bridge')}` },
      ],
      stepNumber: snapshot.tick,
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'sovereign-world-kernel',
        sovereignWorld: {
          snapshot,
          eventLog,
        },
      },
    };
  }
}

/**
 * Simulation snapshot type (local to this module)
 */
interface SimulationSnapshot {
  id: string;
  simulationId: string;
  step: number;
  stateBlog: string;
  deltaBlog?: string;
  checksum: string;
  createdAt: string;
}
