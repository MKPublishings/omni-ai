CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_username ON auth_users(username);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

INSERT OR IGNORE INTO auth_users (
  id,
  username,
  email,
  password_hash,
  display_name,
  role,
  email_verified,
  created_at,
  updated_at,
  last_login_at
) VALUES (
  '2c4507fd-8afb-4f88-bd1c-fdd7d981fe38',
  'ionadminmirnes',
  'ionadminmirnes@ionirix.local',
  'pbkdf2_sha256$210000$r6a_dckAhjNj7fwu57IxqQ$lqA6HrorV_GmJgd1z5ZH2lA_nbm0ennCATwk1nhiOwY',
  'ION Admin Mirnes',
  'admin',
  1,
  '2026-04-15T23:59:00.000Z',
  '2026-04-15T23:59:00.000Z',
  NULL
);
