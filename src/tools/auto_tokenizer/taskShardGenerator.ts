import { randomUUID } from "node:crypto";
import type {
  AgentProfile,
  AgentRole,
  Department,
  HandoffEnvelope,
  Priority,
  TaskShard,
  Ticket,
  TicketEvent
} from "../../mind/contracts/taskShardContracts";

const ROLE_BY_DEPARTMENT: Record<Department, AgentRole> = {
  Infra: "Engineer",
  Research: "Synthesizer",
  Creative: "Synthesizer",
  Ops: "Manager",
  Finance: "Analyst"
};

export interface TicketSeed {
  title: string;
  department: Department;
  priority?: Priority;
  summary: string;
  input_payload?: unknown;
  legacy_weight?: number;
  decay_at?: string;
  created_by?: string;
}

export interface ShardGenerationResult {
  ticket: Ticket;
  shards: TaskShard[];
  assignmentPlan: Array<{
    shard_id: string;
    role: AgentRole;
    assigned_agent_id: string;
  }>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeLegacyWeight(input: number | undefined): number {
  if (typeof input !== "number" || Number.isNaN(input)) return 0.5;
  return Math.max(0, Math.min(1, input));
}

function inferShardSummaries(seed: TicketSeed): string[] {
  const payload = seed.input_payload as { objectives?: unknown; workstreams?: unknown } | undefined;

  const fromWorkstreams = Array.isArray(payload?.workstreams)
    ? payload.workstreams
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : [];

  if (fromWorkstreams.length > 0) {
    return fromWorkstreams;
  }

  const fromObjectives = Array.isArray(payload?.objectives)
    ? payload.objectives
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : [];

  if (fromObjectives.length > 0) {
    return fromObjectives;
  }

  const sentenceParts = seed.summary
    .split(/[\n\.]/g)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentenceParts.length > 1) {
    return sentenceParts;
  }

  return [seed.summary.trim() || seed.title.trim()];
}

function selectAgentForRole(role: AgentRole, profiles: AgentProfile[]): string {
  const exact = profiles.find((profile) => profile.role === role);
  if (exact) return exact.id;

  const manager = profiles.find((profile) => profile.role === "Manager");
  if (manager) return manager.id;

  return "agent.conductor.blackwell";
}

function makeTicketEvent(actor: string, action: TicketEvent["action"], note?: string): TicketEvent {
  return {
    at: nowIso(),
    actor,
    action,
    note
  };
}

export function createTicketFromSeed(seed: TicketSeed): Ticket {
  const now = nowIso();
  const actor = seed.created_by || "agent.conductor.blackwell";

  return {
    id: randomUUID(),
    title: seed.title.trim(),
    status: "queued",
    department: seed.department,
    created_at: now,
    updated_at: now,
    shards: [],
    history: [makeTicketEvent(actor, "created", "Ticket created from shard generator seed")]
  };
}

export function generateTaskShards(seed: TicketSeed, profiles: AgentProfile[]): ShardGenerationResult {
  const ticket = createTicketFromSeed(seed);
  const inferredRole = ROLE_BY_DEPARTMENT[seed.department];
  const summaries = inferShardSummaries(seed);

  const shards = summaries.map((summary) => {
    const shard: TaskShard = {
      id: randomUUID(),
      parent_ticket_id: ticket.id,
      department: seed.department,
      role_hint: inferredRole,
      summary,
      input_payload: seed.input_payload ?? {},
      priority: seed.priority ?? "normal",
      legacy_weight: normalizeLegacyWeight(seed.legacy_weight),
      created_at: nowIso(),
      decay_at: seed.decay_at
    };

    return shard;
  });

  ticket.shards = shards.map((shard) => shard.id);
  ticket.updated_at = nowIso();
  ticket.history.push(
    makeTicketEvent(
      "agent.conductor.blackwell",
      "updated",
      `Generated ${shards.length} shard(s) for department ${seed.department}`
    )
  );

  const assignmentPlan = shards.map((shard) => {
    const role = shard.role_hint ?? inferredRole;
    const assigned_agent_id = selectAgentForRole(role, profiles);

    ticket.history.push(
      makeTicketEvent(
        "agent.conductor.blackwell",
        "assigned",
        `Assigned shard ${shard.id} to ${assigned_agent_id}`
      )
    );

    return {
      shard_id: shard.id,
      role,
      assigned_agent_id
    };
  });

  ticket.status = "in_progress";
  ticket.updated_at = nowIso();

  return {
    ticket,
    shards,
    assignmentPlan
  };
}

export function createHandoffEnvelope(input: {
  from_agent: string;
  to_agent: string;
  shard_id: string;
  context_summary: string;
  payload: unknown;
  emotional_tone?: HandoffEnvelope["emotional_tone"];
}): HandoffEnvelope {
  return {
    from_agent: input.from_agent,
    to_agent: input.to_agent,
    shard_id: input.shard_id,
    context_summary: input.context_summary,
    emotional_tone: input.emotional_tone ?? "neutral",
    payload: input.payload
  };
}
