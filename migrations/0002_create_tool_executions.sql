-- ============================================================
-- Migration 0002: tool_executions table
-- ============================================================
-- Audit trail for all tool executions
-- Captures input, output, status, duration, and error information

CREATE TABLE IF NOT EXISTS tool_executions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  tool_version TEXT DEFAULT '1.0.0',
  input_payload TEXT NOT NULL,
  output_payload TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'success', 'error', 'timeout')),
  error_message TEXT,
  duration_ms INTEGER,
  mode TEXT,
  simulation_id TEXT,
  worker_region TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- Indexes for efficient querying and aggregation
CREATE INDEX IF NOT EXISTS idx_tool_exec_session ON tool_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_exec_tool ON tool_executions(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_exec_status ON tool_executions(status);
CREATE INDEX IF NOT EXISTS idx_tool_exec_simulation ON tool_executions(simulation_id);
CREATE INDEX IF NOT EXISTS idx_tool_exec_created ON tool_executions(created_at DESC);
