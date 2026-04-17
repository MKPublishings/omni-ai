CREATE TABLE IF NOT EXISTS auth_user_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'manual',
  starts_at TEXT,
  ends_at TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_user_entitlements_user_id ON auth_user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_user_entitlements_status ON auth_user_entitlements(status);
CREATE INDEX IF NOT EXISTS idx_auth_user_entitlements_window ON auth_user_entitlements(user_id, status, starts_at, ends_at);