CREATE TABLE IF NOT EXISTS billing_customers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_customer_id TEXT UNIQUE,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_billing_customers_provider ON billing_customers(provider);

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  billing_customer_id TEXT,
  plan_tier TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
  FOREIGN KEY (billing_customer_id) REFERENCES billing_customers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_user_id ON billing_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_status ON billing_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_plan_tier ON billing_subscriptions(plan_tier);

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'stripe',
  event_type TEXT NOT NULL,
  external_event_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'received',
  payload_json TEXT NOT NULL,
  error_message TEXT,
  processed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_provider ON billing_webhook_events(provider);
CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_type ON billing_webhook_events(event_type);

CREATE TABLE IF NOT EXISTS premium_sweep_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  query TEXT NOT NULL,
  target_domains TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  result_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_premium_sweep_runs_user_id ON premium_sweep_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_sweep_runs_session_id ON premium_sweep_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_premium_sweep_runs_status ON premium_sweep_runs(status);