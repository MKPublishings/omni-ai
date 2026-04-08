-- ============================================================
-- Migration 0005: simulation_snapshots table
-- ============================================================
-- Immutable snapshots of simulation state at each step
-- Enables rollback, comparison, and state recovery

CREATE TABLE IF NOT EXISTS simulation_snapshots (
  id TEXT PRIMARY KEY,
  simulation_id TEXT NOT NULL,
  step INTEGER NOT NULL,
  state_blob TEXT NOT NULL,
  delta_blob TEXT,
  checksum TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(simulation_id) REFERENCES simulation_runs(id) ON DELETE CASCADE,
  UNIQUE(simulation_id, step)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_snap_sim ON simulation_snapshots(simulation_id);
CREATE INDEX IF NOT EXISTS idx_snap_step ON simulation_snapshots(step);
CREATE INDEX IF NOT EXISTS idx_snap_checksum ON simulation_snapshots(checksum);
