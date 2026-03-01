CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  status INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_path ON logs(path);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);

CREATE TABLE IF NOT EXISTS errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_errors_created_at ON errors(created_at);

CREATE TABLE IF NOT EXISTS mind_tickets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  department TEXT NOT NULL,
  priority TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mind_tickets_status ON mind_tickets(status);
CREATE INDEX IF NOT EXISTS idx_mind_tickets_department ON mind_tickets(department);
CREATE INDEX IF NOT EXISTS idx_mind_tickets_created_at ON mind_tickets(created_at);

CREATE TABLE IF NOT EXISTS mind_task_shards (
  id TEXT PRIMARY KEY,
  parent_ticket_id TEXT NOT NULL,
  department TEXT NOT NULL,
  role_hint TEXT,
  summary TEXT NOT NULL,
  input_payload_json TEXT NOT NULL,
  priority TEXT NOT NULL,
  legacy_weight REAL NOT NULL,
  created_at TEXT NOT NULL,
  decay_at TEXT,
  FOREIGN KEY(parent_ticket_id) REFERENCES mind_tickets(id)
);

CREATE INDEX IF NOT EXISTS idx_mind_task_shards_parent_ticket_id ON mind_task_shards(parent_ticket_id);
CREATE INDEX IF NOT EXISTS idx_mind_task_shards_department ON mind_task_shards(department);
CREATE INDEX IF NOT EXISTS idx_mind_task_shards_priority ON mind_task_shards(priority);

CREATE TABLE IF NOT EXISTS mind_ticket_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT NOT NULL,
  shard_id TEXT,
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY(ticket_id) REFERENCES mind_tickets(id)
);

CREATE INDEX IF NOT EXISTS idx_mind_ticket_events_ticket_id ON mind_ticket_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_mind_ticket_events_at ON mind_ticket_events(at);

CREATE TABLE IF NOT EXISTS mind_shard_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT NOT NULL,
  shard_id TEXT NOT NULL,
  role TEXT NOT NULL,
  assigned_agent_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  FOREIGN KEY(ticket_id) REFERENCES mind_tickets(id),
  FOREIGN KEY(shard_id) REFERENCES mind_task_shards(id)
);

CREATE INDEX IF NOT EXISTS idx_mind_shard_assignments_ticket_id ON mind_shard_assignments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_mind_shard_assignments_shard_id ON mind_shard_assignments(shard_id);
