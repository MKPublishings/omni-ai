CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  seed INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_images_prompt ON images(prompt);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at);
