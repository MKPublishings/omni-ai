CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  dims INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_embeddings_text ON embeddings(text);
CREATE INDEX IF NOT EXISTS idx_embeddings_created_at ON embeddings(created_at);

CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  description TEXT,
  r2_key TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON snapshots(created_at);
