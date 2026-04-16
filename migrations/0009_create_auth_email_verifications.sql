CREATE TABLE IF NOT EXISTS auth_email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  consumed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_email_verifications_user_id ON auth_email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_email_verifications_expires_at ON auth_email_verifications(expires_at);