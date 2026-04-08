/**
 * @module Simulation Types
 * @spec: environment-mode, cosmic-mode, multiverse-mode
 * 
 * TypeScript types for the simulation subsystem.
 * Covers simulation runs, state, snapshots, and control.
 */

export type SimulationMode = 'environment' | 'cosmic' | 'multiverse' | 'custom';
export type SimulationStatus = 'initializing' | 'running' | 'paused' | 'completed' | 'terminated' | 'error';

/**
 * A simulation run record stored in D1
 */
export interface SimulationRun {
  id: string;
  sessionId: string;
  mode: SimulationMode;
  config: Record<string, unknown>; // mode-specific configuration
  seed?: string; // for deterministic runs
  status: SimulationStatus;
  currentStep: number;
  maxSteps?: number;
  memoryUsageKb: number;
  entityCount: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  completedAt: string | null; // ISO 8601
}

/**
 * Simulation state snapshot
 */
export interface SimulationSnapshot {
  id: string;
  simulationId: string;
  step: number;
  stateBlog: string; // JSON stringified state
  deltaBlog?: string; // JSON stringified delta from previous state
  checksum: string; // SHA-256 of state
  createdAt: string; // ISO 8601
}

/**
 * Simulation state data (in-memory representation)
 */
export interface SimulationState {
  entities: Record<string, unknown>[];
  environment: Record<string, unknown>;
  rules: Record<string, unknown>[];
  stepNumber: number;
  timestamp: string; // ISO 8601
  metadata: Record<string, unknown>;
}

/**
 * Delta between simulation states
 */
export interface SimulationDelta {
  addedEntities: string[]; // entity IDs
  modifiedEntities: Record<string, unknown>; // entity ID -> changes
  removedEntities: string[];
  environmentChanges: Record<string, unknown>;
  timestamp: string;
}

/**
 * Request to initialize simulation
 */
export interface SimulationInitRequest {
  mode: SimulationMode;
  config: Record<string, unknown>;
  seed?: string;
  maxSteps?: number;
}

/**
 * Response from simulation init
 */
export interface SimulationInitResponse {
  simulationId: string;
  mode: SimulationMode;
  status: SimulationStatus;
  createdAt: string;
}

/**
 * Request to step simulation
 */
export interface SimulationStepRequest {
  simulationId: string;
  count?: number; // default 1
}

/**
 * Response from simulation step
 */
export interface SimulationStepResponse {
  step: number;
  state: SimulationState;
  delta: SimulationDelta;
  entityCount: number;
  memoryKb: number;
  timestampMs: number;
}

/**
 * Simulation history (list of past runs)
 */
export interface SimulationHistoryResponse {
  runs: SimulationRun[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Simulation rollback request
 */
export interface SimulationRollbackRequest {
  simulationId: string;
  toStep: number;
}

/**
 * Simulation statistics
 */
export interface SimulationStats {
  totalRuns: number;
  activeRuns: number;
  completedRuns: number;
  terminatedRuns: number;
  byMode: Record<SimulationMode, number>;
  avgStepsPerRun: number;
  avgDurationSeconds: number;
}
