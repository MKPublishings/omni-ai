CREATE TABLE IF NOT EXISTS onboarding_workspaces (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL UNIQUE,
  workspace_name TEXT NOT NULL,
  workspace_slug TEXT NOT NULL,
  primary_route TEXT NOT NULL,
  capability_score INTEGER NOT NULL DEFAULT 0,
  provisioning_status TEXT NOT NULL DEFAULT 'pending-verification',
  source TEXT NOT NULL DEFAULT 'onboarding',
  shell_json TEXT NOT NULL,
  modules_json TEXT NOT NULL,
  orchestration_json TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  context_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_onboarding_workspaces_user_id ON onboarding_workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_workspaces_status ON onboarding_workspaces(provisioning_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_workspaces_user_slug ON onboarding_workspaces(user_id, workspace_slug);
