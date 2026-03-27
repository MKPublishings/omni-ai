/**
 * Ionirix Environment Mode — Environment Engine
 * Core orchestrator for planetary simulation lifecycle
 * © 2026 MK Publishing. All Rights Reserved.
 */

import {
  SimulationState,
  SimulationStatus,
  SimulationConfig,
  SimulationStep,
  SimulationEvent,
  SimulationMetrics,
  SimulationLog,
  EnvironmentSnapshot,
  SystemHealth,
  ScaleLevel,
  SeededRandom,
} from '../types/environment.types';
import { ScaleManager, SCALE_RESOLUTIONS } from './scale-manager';

// ─── System Interface ────────────────────────────────────────────

export type SystemId =
  | 'climate' | 'hydrology' | 'ecology' | 'geology'
  | 'infrastructure' | 'population' | 'energy'
  | 'economy' | 'governance' | 'transport';

export interface ISimulationSystem {
  readonly id: SystemId;
  readonly dependencies: SystemId[];

  initialize(config: SimulationConfig, scaleManager: ScaleManager, rng: SeededRandom): void;
  step(
    tick: number,
    deltaHours: number,
    systemStates: Map<string, unknown>,
    scaleManager: ScaleManager,
    rng: SeededRandom,
  ): { state: unknown; events: SimulationEvent[]; metrics: Record<string, number> };
  getHealth(): SystemHealth;
  serialize(): string;
  deserialize(data: string): void;
  teardown(): void;
}

// ─── Engine Configuration ────────────────────────────────────────

export interface EngineConfig extends SimulationConfig {
  maxTicksPerFrame?: number;
  eventBufferSize?: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  seed: 42,
  startYear: 2026,
  timeAcceleration: 1,
  enabledSystems: [
    'climate', 'hydrology', 'ecology', 'geology',
    'infrastructure', 'population', 'energy',
    'economy', 'governance', 'transport',
  ],
  crossScalePropagation: true,
  snapshotIntervalTicks: 100,
  maxSnapshots: 50,
  logVerbosity: 'normal',
  activeScale: ScaleLevel.PLANET,
  focusRegionId: null,
  maxTicksPerFrame: 10,
  eventBufferSize: 10000,
};

// ─── Dependency Graph ────────────────────────────────────────────

const SYSTEM_DEPENDENCIES: Record<SystemId, SystemId[]> = {
  climate:        [],
  hydrology:      ['climate'],
  ecology:        ['climate', 'hydrology'],
  geology:        ['climate'],
  infrastructure: ['geology', 'population'],
  population:     ['ecology', 'infrastructure'],
  energy:         ['infrastructure', 'geology'],
  economy:        ['population', 'energy', 'infrastructure'],
  governance:     ['population', 'economy'],
  transport:      ['infrastructure', 'economy'],
};

// ─── Environment Engine ──────────────────────────────────────────

export class EnvironmentEngine {
  private config: EngineConfig;
  private state: SimulationState;
  private systems: Map<SystemId, ISimulationSystem> = new Map();
  private executionOrder: SystemId[] = [];
  private snapshots: EnvironmentSnapshot[] = [];
  private scaleManager: ScaleManager;
  private rng: SeededRandom;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private eventListeners: Map<string, Array<(event: SimulationEvent) => void>> = new Map();

  constructor(config?: Partial<EngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = new SeededRandom(this.config.seed);
    this.scaleManager = new ScaleManager(this.config.seed);
    this.state = {
      status: SimulationStatus.IDLE,
      currentTick: 0,
      elapsedSimHours: 0,
      wallClockStartMs: 0,
      activeScale: this.config.activeScale,
      focusRegionId: this.config.focusRegionId,
      systemStates: new Map(),
      eventLog: [],
      seed: this.config.seed,
    };
  }

  // ── System Registration ────────────────────────────────────────

  registerSystem(system: ISimulationSystem): void {
    this.systems.set(system.id, system);
    this.rebuildExecutionOrder();
  }

  unregisterSystem(id: SystemId): void {
    this.systems.delete(id);
    this.rebuildExecutionOrder();
  }

  getSystem<T extends ISimulationSystem>(id: SystemId): T | undefined {
    return this.systems.get(id) as T | undefined;
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  initialize(): void {
    this.log('info', 'engine', `Initializing with seed ${this.config.seed}, ${this.systems.size} systems`);

    for (const sysId of this.executionOrder) {
      if (!this.config.enabledSystems.includes(sysId)) continue;
      const system = this.systems.get(sysId);
      if (system) {
        system.initialize(this.config, this.scaleManager, this.rng);
        this.log('debug', sysId, `System initialized`);
      }
    }

    this.state.status = SimulationStatus.IDLE;
    this.state.currentTick = 0;
    this.state.elapsedSimHours = 0;
    this.log('info', 'engine', 'Initialization complete');
  }

  start(): void {
    if (this.state.status === SimulationStatus.RUNNING) return;

    this.state.status = SimulationStatus.RUNNING;
    this.state.wallClockStartMs = Date.now();
    this.log('info', 'engine', 'Simulation started');

    const resolution = SCALE_RESOLUTIONS[this.state.activeScale];
    const intervalMs = (resolution.timeStepHours / this.config.timeAcceleration) * 1000;

    this.tickTimer = setInterval(() => {
      this.executeTick();
    }, Math.max(16, intervalMs));
  }

  pause(): void {
    if (this.state.status !== SimulationStatus.RUNNING) return;
    this.state.status = SimulationStatus.PAUSED;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.log('info', 'engine', `Paused at tick ${this.state.currentTick}`);
  }

  resume(): void {
    if (this.state.status !== SimulationStatus.PAUSED) return;
    this.start();
  }

  stop(): void {
    this.state.status = SimulationStatus.COMPLETED;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.log('info', 'engine', `Stopped at tick ${this.state.currentTick}`);
  }

  reset(): void {
    this.stop();
    this.rng = new SeededRandom(this.config.seed);
    this.scaleManager = new ScaleManager(this.config.seed);
    this.state = {
      status: SimulationStatus.IDLE,
      currentTick: 0,
      elapsedSimHours: 0,
      wallClockStartMs: 0,
      activeScale: this.config.activeScale,
      focusRegionId: this.config.focusRegionId,
      systemStates: new Map(),
      eventLog: [],
      seed: this.config.seed,
    };
    this.snapshots = [];
    this.initialize();
    this.log('info', 'engine', 'Reset complete');
  }

  // ── Tick Execution ─────────────────────────────────────────────

  executeTick(): SimulationStep {
    const startMs = performance.now();
    const resolution = SCALE_RESOLUTIONS[this.state.activeScale];
    const deltaHours = resolution.timeStepHours;
    const tick = ++this.state.currentTick;
    this.state.elapsedSimHours += deltaHours;

    const allEvents: SimulationEvent[] = [];
    const allMetrics: Record<string, Record<string, number>> = {};

    for (const sysId of this.executionOrder) {
      if (!this.config.enabledSystems.includes(sysId)) continue;
      const system = this.systems.get(sysId);
      if (!system) continue;

      try {
        const result = system.step(
          tick,
          deltaHours,
          this.state.systemStates,
          this.scaleManager,
          this.rng,
        );

        this.state.systemStates.set(sysId, result.state);
        allEvents.push(...result.events);
        allMetrics[sysId] = result.metrics;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.log('error', sysId, `Step failed: ${msg}`);
        allEvents.push({
          id: `err_${tick}_${sysId}`,
          tick,
          system: sysId,
          type: 'system_error',
          severity: 'critical',
          regionId: 'global',
          description: `System ${sysId} failed: ${msg}`,
          data: {},
        });
      }
    }

    // Cross-scale propagation
    if (this.config.crossScalePropagation) {
      this.propagateCrossScale(allEvents);
    }

    // Emit events
    for (const event of allEvents) {
      this.emitEvent(event);
    }

    // Auto-snapshot
    if (this.config.snapshotIntervalTicks > 0 &&
        tick % this.config.snapshotIntervalTicks === 0) {
      this.takeSnapshot(`auto_tick_${tick}`);
    }

    const cpuTimeMs = performance.now() - startMs;

    const step: SimulationStep = {
      tick,
      deltaHours,
      systemUpdates: new Map(this.state.systemStates),
      events: allEvents,
      metrics: { tick, timestamp: Date.now(), cpuTimeMs, systemMetrics: allMetrics },
    };

    // Trim event log
    const maxLog = this.config.eventBufferSize ?? 10000;
    if (this.state.eventLog.length > maxLog) {
      this.state.eventLog = this.state.eventLog.slice(-maxLog);
    }

    return step;
  }

  executeSteps(count: number): SimulationStep[] {
    const steps: SimulationStep[] = [];
    for (let i = 0; i < count; i++) {
      steps.push(this.executeTick());
    }
    return steps;
  }

  // ── Scale Navigation ───────────────────────────────────────────

  zoomIn(): ScaleLevel {
    const level = this.scaleManager.zoomIn();
    this.state.activeScale = level;
    return level;
  }

  zoomOut(): ScaleLevel {
    const level = this.scaleManager.zoomOut();
    this.state.activeScale = level;
    return level;
  }

  setFocus(regionId: string | null): void {
    this.state.focusRegionId = regionId;
  }

  // ── Snapshots ──────────────────────────────────────────────────

  takeSnapshot(label: string): EnvironmentSnapshot {
    const serialized = this.serializeState();
    const snapshot: EnvironmentSnapshot = {
      id: `snap_${this.state.currentTick}_${Date.now()}`,
      tick: this.state.currentTick,
      timestamp: Date.now(),
      label,
      state: serialized,
      checksum: this.hashString(serialized),
    };

    this.snapshots.push(snapshot);

    if (this.snapshots.length > this.config.maxSnapshots) {
      this.snapshots.shift();
    }

    this.log('info', 'engine', `Snapshot saved: ${label} at tick ${this.state.currentTick}`);
    return snapshot;
  }

  rollback(snapshotId: string): boolean {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      this.log('warn', 'engine', `Snapshot ${snapshotId} not found`);
      return false;
    }

    this.deserializeState(snapshot.state);
    this.log('info', 'engine', `Rolled back to snapshot: ${snapshot.label} (tick ${snapshot.tick})`);
    return true;
  }

  getSnapshots(): EnvironmentSnapshot[] {
    return [...this.snapshots];
  }

  // ── Event System ───────────────────────────────────────────────

  on(eventType: string, listener: (event: SimulationEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(listener);
    this.eventListeners.set(eventType, listeners);
  }

  off(eventType: string, listener: (event: SimulationEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      this.eventListeners.set(eventType, listeners.filter(l => l !== listener));
    }
  }

  private emitEvent(event: SimulationEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    const wildcardListeners = this.eventListeners.get('*') || [];
    for (const listener of [...listeners, ...wildcardListeners]) {
      try { listener(event); } catch { /* swallow listener errors */ }
    }
  }

  // ── Inject External Events ─────────────────────────────────────

  injectEvent(event: Omit<SimulationEvent, 'id' | 'tick'>): void {
    const fullEvent: SimulationEvent = {
      ...event,
      id: `inject_${this.state.currentTick}_${this.rng.nextInt(0, 99999)}`,
      tick: this.state.currentTick,
    };
    this.state.eventLog.push({
      tick: fullEvent.tick,
      timestamp: Date.now(),
      level: 'info',
      system: fullEvent.system,
      message: `Injected event: ${fullEvent.description}`,
    });
    this.emitEvent(fullEvent);
  }

  // ── State Accessors ────────────────────────────────────────────

  getState(): SimulationState {
    return { ...this.state };
  }

  getConfig(): EngineConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<EngineConfig>): void {
    Object.assign(this.config, partial);
  }

  getScaleManager(): ScaleManager {
    return this.scaleManager;
  }

  getSystemHealth(): SystemHealth[] {
    const healthReports: SystemHealth[] = [];
    for (const [, system] of this.systems) {
      healthReports.push(system.getHealth());
    }
    return healthReports;
  }

  getEventLog(count?: number): SimulationLog[] {
    const log = this.state.eventLog;
    return count ? log.slice(-count) : [...log];
  }

  // ── Serialization ──────────────────────────────────────────────

  serializeState(): string {
    const systemData: Record<string, string> = {};
    for (const [id, system] of this.systems) {
      systemData[id] = system.serialize();
    }

    return JSON.stringify({
      config: this.config,
      tick: this.state.currentTick,
      elapsedSimHours: this.state.elapsedSimHours,
      activeScale: this.state.activeScale,
      focusRegionId: this.state.focusRegionId,
      seed: this.state.seed,
      rngState: this.rng.getState(),
      scaleManager: this.scaleManager.serialize(),
      systems: systemData,
      eventLog: this.state.eventLog.slice(-1000),
    });
  }

  deserializeState(data: string): void {
    const parsed = JSON.parse(data);
    this.config = { ...DEFAULT_CONFIG, ...parsed.config };
    this.state.currentTick = parsed.tick;
    this.state.elapsedSimHours = parsed.elapsedSimHours;
    this.state.activeScale = parsed.activeScale;
    this.state.focusRegionId = parsed.focusRegionId;
    this.state.seed = parsed.seed;
    this.state.status = SimulationStatus.PAUSED;

    this.rng.setState(parsed.rngState);
    this.scaleManager.deserialize(parsed.scaleManager);

    for (const [id, systemData] of Object.entries(parsed.systems)) {
      const system = this.systems.get(id as SystemId);
      if (system) system.deserialize(systemData as string);
    }
  }

  // ── Teardown ───────────────────────────────────────────────────

  teardown(): void {
    this.stop();
    for (const [, system] of this.systems) {
      system.teardown();
    }
    this.systems.clear();
    this.eventListeners.clear();
    this.snapshots = [];
    this.log('info', 'engine', 'Engine torn down');
  }

  // ── Private ────────────────────────────────────────────────────

  private rebuildExecutionOrder(): void {
    const visited = new Set<SystemId>();
    const order: SystemId[] = [];

    const visit = (id: SystemId) => {
      if (visited.has(id)) return;
      visited.add(id);
      const deps = SYSTEM_DEPENDENCIES[id] || [];
      for (const dep of deps) {
        if (this.systems.has(dep)) visit(dep);
      }
      order.push(id);
    };

    for (const id of this.systems.keys()) {
      visit(id);
    }

    this.executionOrder = order;
  }

  private propagateCrossScale(events: SimulationEvent[]): void {
    for (const event of events) {
      if (event.severity === 'critical' || event.severity === 'catastrophic') {
        this.scaleManager.propagateUpward(event.regionId, `${event.type}_impact`, 1);
      }
    }
  }

  private log(level: SimulationLog['level'], system: string, message: string): void {
    if (this.config.logVerbosity === 'minimal' && level === 'debug') return;
    if (this.config.logVerbosity === 'normal' && level === 'debug') return;

    this.state.eventLog.push({
      tick: this.state.currentTick,
      timestamp: Date.now(),
      level,
      system,
      message,
    });
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}
