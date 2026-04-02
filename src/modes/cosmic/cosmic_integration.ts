// =============================================================================
// cosmic_integration.ts
// Ionirix Cosmic Mode - Integration adapter and event bus
// =============================================================================

import type { CosmicSimulationConfig, CosmicSimulationState, GalacticPosition } from "./cosmic_schema.ts";
import { CosmicEngine } from "./cosmic_engine.ts";

export type CosmicEventType =
  | "cosmic:initialized"
  | "cosmic:step"
  | "cosmic:snapshot"
  | "cosmic:paused"
  | "cosmic:completed";

export interface CosmicEvent {
  type: CosmicEventType;
  timestamp: number;
  payload: unknown;
}

export type CosmicEventHandler = (event: CosmicEvent) => void;

export class CosmicEventBus {
  private handlers: Map<CosmicEventType, CosmicEventHandler[]> = new Map();

  public on(type: CosmicEventType, handler: CosmicEventHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type)?.push(handler);
    return () => {
      const list = this.handlers.get(type);
      if (!list) return;
      const idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
    };
  }

  public emit(event: CosmicEvent): void {
    for (const handler of this.handlers.get(event.type) ?? []) handler(event);
  }
}

export function galacticToCartesian(pos: GalacticPosition): { x: number; y: number; z: number } {
  return { x: pos.R * Math.cos(pos.phi), y: pos.R * Math.sin(pos.phi), z: pos.z };
}

export class CosmicModeAdapter {
  private engine: CosmicEngine;
  private eventBus: CosmicEventBus;
  private isRunning = false;
  private isPaused = false;

  constructor(config: CosmicSimulationConfig) {
    this.engine = new CosmicEngine(config);
    this.eventBus = new CosmicEventBus();

    this.engine.onStep = (state) => {
      this.eventBus.emit({
        type: "cosmic:step",
        timestamp: Date.now(),
        payload: { time: state.current_time, step: state.step_count }
      });
    };

    this.engine.onSnapshot = (state) => {
      this.eventBus.emit({
        type: "cosmic:snapshot",
        timestamp: Date.now(),
        payload: state
      });
    };
  }

  public initialize(): void {
    this.engine.initialize();
    this.eventBus.emit({ type: "cosmic:initialized", timestamp: Date.now(), payload: null });
  }

  public start(steps?: number): void {
    this.isRunning = true;
    this.isPaused = false;
    this.engine.run(steps);
    this.isRunning = false;
    this.eventBus.emit({ type: "cosmic:completed", timestamp: Date.now(), payload: this.engine.getState().diagnostics });
  }

  public pause(): void {
    this.isPaused = true;
    this.isRunning = false;
    this.eventBus.emit({ type: "cosmic:paused", timestamp: Date.now(), payload: null });
  }

  public stepOnce(): void {
    this.engine.step();
  }

  public getState(): CosmicSimulationState {
    return this.engine.getState();
  }

  public getEventBus(): CosmicEventBus {
    return this.eventBus;
  }

  public save(): string {
    return this.engine.serialize();
  }

  public load(serialized: string): void {
    this.engine = CosmicEngine.deserialize(serialized);
  }

  public get running(): boolean {
    return this.isRunning;
  }

  public get paused(): boolean {
    return this.isPaused;
  }
}
