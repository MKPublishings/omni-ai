CREATE TABLE IF NOT EXISTS tts (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  voice TEXT,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tts_text ON tts(text);
CREATE INDEX IF NOT EXISTS idx_tts_created_at ON tts(created_at);

CREATE TABLE IF NOT EXISTS stt (
  id TEXT PRIMARY KEY,
  transcript TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stt_created_at ON stt(created_at);
