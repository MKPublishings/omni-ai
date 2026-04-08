-- ============================================================
-- Migration 0004: simulation_runs table
-- ============================================================
-- Tracks active and completed simulation runs
-- Records mode, config, state, and performance metrics

CREATE TABLE IF NOT EXISTS simulation_runs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('environment', 'cosmic', 'multiverse', 'custom')),
  config TEXT NOT NULL,
  seed TEXT,
  status TEXT NOT NULL CHECK(status IN ('initializing', 'running', 'paused', 'completed', 'terminated', 'error')) DEFAULT 'initializing',
  current_step INTEGER DEFAULT 0,
  max_steps INTEGER,
  memory_usage_kb REAL DEFAULT 0,
  entity_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sim_session ON simulation_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_sim_mode ON simulation_runs(mode);
CREATE INDEX IF NOT EXISTS idx_sim_status ON simulation_runs(status);
CREATE INDEX IF NOT EXISTS idx_sim_created ON simulation_runs(created_at DESC);
