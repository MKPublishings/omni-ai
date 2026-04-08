-- ============================================================
-- Migration 0006: system_events table
-- ============================================================
-- Audit log of all system events
-- Used for observability, debugging, and dashboards

CREATE TABLE IF NOT EXISTS system_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('info', 'warn', 'error', 'critical')) DEFAULT 'info',
  message TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_events_type ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_severity ON system_events(severity);
CREATE INDEX IF NOT EXISTS idx_events_source ON system_events(source);
CREATE INDEX IF NOT EXISTS idx_events_created ON system_events(created_at DESC);
