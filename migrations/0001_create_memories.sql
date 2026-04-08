-- ============================================================
-- Migration 0001: memories table
-- ============================================================
-- Stores all memories (chat, simulation, system, codex types)
-- Supports TTL enforcement, pinning, categorization, and tagging

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('chat', 'simulation', 'system', 'codex')),
  category TEXT,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  embedding_vector BLOB,
  source TEXT DEFAULT 'user' CHECK(source IN ('user', 'tool', 'simulation', 'system', 'codex')),
  mode TEXT,
  simulation_id TEXT,
  priority INTEGER DEFAULT 0,
  ttl_seconds INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  is_pinned INTEGER DEFAULT 0,
  tags TEXT DEFAULT '[]'
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_simulation ON memories(simulation_id);
CREATE INDEX IF NOT EXISTS idx_memories_key ON memories(key);
CREATE INDEX IF NOT EXISTS idx_memories_expires ON memories(expires_at);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at DESC);
