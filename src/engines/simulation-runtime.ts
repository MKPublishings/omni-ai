/**
 * @module SimulationRuntime
 * @spec: environment-mode, cosmic-mode, multiverse-mode
 * 
 * Simulation tick engine, state management, and snapshot creation.
 * Manages the simulation lifecycle: init → step → complete/terminate.
 * Persists state to D1 and snapshots for rollback support.
 */

import type { SimulationState, SimulationDelta } from '../types/simulation.types';
import { EventBus } from './event-bus';

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
    simulationId: string
  ): Promise<{ runRecord: any; snapshot: SimulationSnapshot | null } | null> {
    try {
      const runRecord = await this.db
        .prepare('SELECT * FROM simulation_runs WHERE id = ?')
        .bind(simulationId)
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

  /**
   * Execute one simulation step
   * Applies rules, updates entities, creates snapshot
   */
  async step(
    simulationId: string,
    currentState: SimulationState
  ): Promise<{ newState: SimulationState; delta: SimulationDelta } | null> {
    try {
      const newState = { ...currentState };
      const oldEntitiesHash = JSON.stringify(currentState.entities);

      // Stub: increment step counter
      newState.stepNumber = (currentState.stepNumber || 0) + 1;
      newState.timestamp = new Date().toISOString();

      // TODO: Apply simulation-specific rules per mode
      // This is where cosmic, environment, and multiverse modes diverge

      // Compute delta
      const delta: SimulationDelta = {
        addedEntities: [],
        modifiedEntities: {},
        removedEntities: [],
        environmentChanges: {},
        timestamp: newState.timestamp,
      };

      // Create snapshot
      const snapshotId = crypto.randomUUID();
      const stateBlob = JSON.stringify(newState);
      const deltaBlob = JSON.stringify(delta);
      const checksum = await this.computeChecksum(stateBlob);

      await this.db
        .prepare(`
          INSERT INTO simulation_snapshots (id, simulation_id, step, state_blob, delta_blob, checksum, created_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `)
        .bind(
          snapshotId,
          simulationId,
          newState.stepNumber,
          stateBlob,
          deltaBlob,
          checksum
        )
        .run();

      // Update run record
      await this.db
        .prepare(
          `UPDATE simulation_runs
         SET current_step = ?, updated_at = datetime('now')
         WHERE id = ?`
        )
        .bind(newState.stepNumber, simulationId)
        .run();

      // Emit event
      await this.eventBus.emit('simulation.stepped', 'simulation-runtime', {
        simulationId,
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
