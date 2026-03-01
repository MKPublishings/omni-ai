export type Priority = "low" | "normal" | "high" | "critical";

export type Department = "Research" | "Ops" | "Finance" | "Creative" | "Infra";

export type AgentRole = "Engineer" | "Synthesizer" | "Archivist" | "Analyst" | "Manager";

export interface TaskShard {
  id: string;
  parent_ticket_id: string;
  department: Department;
  role_hint?: AgentRole;
  summary: string;
  input_payload: unknown;
  priority: Priority;
  legacy_weight: number;
  created_at: string;
  decay_at?: string;
}

export type TicketStatus = "queued" | "in_progress" | "handoff" | "done" | "stalled";

export interface TicketEvent {
  at: string;
  actor: string;
  action: "created" | "updated" | "handoff" | "completed" | "stalled" | "assigned" | "inscribed";
  note?: string;
}

export interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  department: Department;
  created_at: string;
  updated_at: string;
  shards: string[];
  history: TicketEvent[];
}

export interface HandoffEnvelope {
  from_agent: string;
  to_agent: string;
  shard_id: string;
  context_summary: string;
  emotional_tone?: "urgent" | "delicate" | "exploratory" | "neutral";
  payload: unknown;
}

export interface AgentProfile {
  id: string;
  role: AgentRole;
  department: Department | "All";
  ritual: string;
  handoff_targets: string[];
}

export interface AgentRoleMatrixEntry {
  role: AgentRole;
  primaryDepartment: Department;
  archetype: string;
  purpose: string;
  defaultHandoffTargets: AgentRole[];
}

export interface LifecycleStep {
  step: number;
  stage: string;
  actor: string;
  output: "TaskShard" | "HandoffEnvelope" | "TicketEvent";
}
