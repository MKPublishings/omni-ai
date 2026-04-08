-- ============================================================
-- Migration 0003: specs table
-- ============================================================
-- Registry of all specifications
-- Supports versioning, status tracking, module linking, and dependency resolution

CREATE TABLE IF NOT EXISTS specs (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL CHECK(status IN ('draft', 'active', 'deprecated', 'archived')) DEFAULT 'draft',
  badge_label TEXT,
  badge_color TEXT,
  summary TEXT,
  content_hash TEXT,
  module_links TEXT DEFAULT '[]',
  codex_links TEXT DEFAULT '[]',
  dependencies TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT,
  UNIQUE(slug, version)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_specs_slug ON specs(slug);
CREATE INDEX IF NOT EXISTS idx_specs_category ON specs(category);
CREATE INDEX IF NOT EXISTS idx_specs_status ON specs(status);
CREATE INDEX IF NOT EXISTS idx_specs_version ON specs(version);
CREATE INDEX IF NOT EXISTS idx_specs_created ON specs(created_at DESC);
