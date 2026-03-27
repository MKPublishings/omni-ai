interface Env {
  IMAGES_URL: string;
  AUDIO_URL: string;
  EMBED_URL: string;
  IMAGES_SERVICE?: Fetcher;
  AUDIO_SERVICE?: Fetcher;
  EMBED_SERVICE?: Fetcher;
  ION_DB?: D1Database;
  AI: Ai;
}

type Priority = "low" | "normal" | "high" | "critical";
type Department = "Research" | "Ops" | "Finance" | "Creative" | "Infra";
type AgentRole = "Engineer" | "Synthesizer" | "Archivist" | "Analyst" | "Manager";

interface AgentProfile {
  id: string;
  role: AgentRole;
  department: Department | "All";
  ritual: string;
  handoff_targets: string[];
}

interface TicketEvent {
  at: string;
  actor: string;
  action: "created" | "updated" | "handoff" | "completed" | "stalled" | "assigned" | "inscribed";
  note?: string;
}

interface Ticket {
  id: string;
  title: string;
  status: "queued" | "in_progress" | "handoff" | "done" | "stalled";
  department: Department;
  created_at: string;
  updated_at: string;
  shards: string[];
  history: TicketEvent[];
}

interface TaskShard {
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

interface GenerateTaskShardRequestBody {
  title?: string;
  summary?: string;
  department?: Department;
  priority?: Priority;
  input_payload?: unknown;
  legacy_weight?: number;
  decay_at?: string;
  created_by?: string;
}

const ROLE_BY_DEPARTMENT: Record<Department, AgentRole> = {
  Infra: "Engineer",
  Research: "Synthesizer",
  Creative: "Synthesizer",
  Ops: "Manager",
  Finance: "Analyst"
};

const BLACKWELL_AGENT_PROFILES: AgentProfile[] = [
  {
    id: "agent.engineer.blackwell",
    role: "Engineer",
    department: "Infra",
    ritual: "Forge the pipeline, expose the seams, leave clean handoff notes.",
    handoff_targets: ["agent.synthesizer.blackwell", "agent.archivist.blackwell"]
  },
  {
    id: "agent.synthesizer.blackwell",
    role: "Synthesizer",
    department: "Creative",
    ritual: "Merge signals into a single, legible beam.",
    handoff_targets: ["agent.archivist.blackwell", "agent.conductor.blackwell"]
  },
  {
    id: "agent.archivist.blackwell",
    role: "Archivist",
    department: "Ops",
    ritual: "Inscribe, index, and make it reusable.",
    handoff_targets: ["agent.analyst.blackwell"]
  },
  {
    id: "agent.analyst.blackwell",
    role: "Analyst",
    department: "Finance",
    ritual: "Measure the flow, expose the friction, propose the next move.",
    handoff_targets: ["agent.engineer.blackwell", "agent.conductor.blackwell"]
  },
  {
    id: "agent.conductor.blackwell",
    role: "Manager",
    department: "Ops",
    ritual: "Keep the pantheon in motion. No shard dies in silence.",
    handoff_targets: [
      "agent.engineer.blackwell",
      "agent.synthesizer.blackwell",
      "agent.archivist.blackwell",
      "agent.analyst.blackwell"
    ]
  }
];

function sanitizeText(value: unknown): string {
  return String(value || "")
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDepartment(value: unknown): Department | null {
  const text = sanitizeText(value);
  if (text === "Research" || text === "Ops" || text === "Finance" || text === "Creative" || text === "Infra") {
    return text;
  }

  return null;
}

function parsePriority(value: unknown): Priority | null {
  const text = sanitizeText(value).toLowerCase();
  if (text === "low" || text === "normal" || text === "high" || text === "critical") {
    return text;
  }

  return null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeLegacyWeight(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function inferShardSummaries(title: string, summary: string, payload: unknown): string[] {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  const fromWorkstreams = Array.isArray(record.workstreams)
    ? record.workstreams.map((item) => sanitizeText(item)).filter(Boolean)
    : [];
  if (fromWorkstreams.length > 0) return fromWorkstreams;

  const fromObjectives = Array.isArray(record.objectives)
    ? record.objectives.map((item) => sanitizeText(item)).filter(Boolean)
    : [];
  if (fromObjectives.length > 0) return fromObjectives;

  const sentenceParts = summary
    .split(/[\n\.]/g)
    .map((part) => sanitizeText(part))
    .filter(Boolean);

  if (sentenceParts.length > 1) return sentenceParts;
  return [sanitizeText(summary) || sanitizeText(title)];
}

function makeEvent(actor: string, action: TicketEvent["action"], note?: string): TicketEvent {
  return {
    at: nowIso(),
    actor,
    action,
    note
  };
}

function selectAgentForRole(role: AgentRole): string {
  const exact = BLACKWELL_AGENT_PROFILES.find((profile) => profile.role === role);
  if (exact) return exact.id;
  return "agent.conductor.blackwell";
}

function generateTaskShardsFromBody(body: GenerateTaskShardRequestBody): {
  ticket: Ticket;
  priority: Priority;
  shards: TaskShard[];
  assignmentPlan: Array<{ shard_id: string; role: AgentRole; assigned_agent_id: string }>;
} {
  const title = sanitizeText(body.title);
  const summary = sanitizeText(body.summary);
  const department = parseDepartment(body.department);
  const priority = parsePriority(body.priority) || "normal";
  const createdBy = sanitizeText(body.created_by) || "agent.conductor.blackwell";

  if (!title || !summary || !department) {
    throw new Error("invalid-request");
  }

  const ticket: Ticket = {
    id: crypto.randomUUID(),
    title,
    status: "queued",
    department,
    created_at: nowIso(),
    updated_at: nowIso(),
    shards: [],
    history: [makeEvent(createdBy, "created", "Ticket created from orchestrator shard generator")]
  };

  const summaries = inferShardSummaries(title, summary, body.input_payload ?? {});
  const roleHint = ROLE_BY_DEPARTMENT[department];
  const legacyWeightRaw = Number(body.legacy_weight);

  const shards = summaries.map((itemSummary) => {
    return {
      id: crypto.randomUUID(),
      parent_ticket_id: ticket.id,
      department,
      role_hint: roleHint,
      summary: itemSummary,
      input_payload: body.input_payload ?? {},
      priority,
      legacy_weight: normalizeLegacyWeight(Number.isFinite(legacyWeightRaw) ? legacyWeightRaw : undefined),
      created_at: nowIso(),
      decay_at: sanitizeText(body.decay_at) || undefined
    } satisfies TaskShard;
  });

  ticket.shards = shards.map((shard) => shard.id);
  ticket.history.push(
    makeEvent("agent.conductor.blackwell", "updated", `Generated ${shards.length} shard(s) for ${department}`)
  );

  const assignmentPlan = shards.map((shard) => {
    const role = shard.role_hint || roleHint;
    const assignedAgentId = selectAgentForRole(role);
    ticket.history.push(
      makeEvent("agent.conductor.blackwell", "assigned", `Assigned shard ${shard.id} to ${assignedAgentId}`)
    );
    return {
      shard_id: shard.id,
      role,
      assigned_agent_id: assignedAgentId
    };
  });

  ticket.status = "in_progress";
  ticket.updated_at = nowIso();

  return {
    ticket,
    priority,
    shards,
    assignmentPlan
  };
}

async function persistTaskShardGeneration(
  db: D1Database,
  generated: {
    ticket: Ticket;
    priority: Priority;
    shards: TaskShard[];
    assignmentPlan: Array<{ shard_id: string; role: AgentRole; assigned_agent_id: string }>;
  }
): Promise<void> {
  const statements: D1PreparedStatement[] = [];

  statements.push(
    db
      .prepare(
        `INSERT INTO mind_tickets (id, title, status, department, priority, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
      )
      .bind(
        generated.ticket.id,
        generated.ticket.title,
        generated.ticket.status,
        generated.ticket.department,
        generated.priority,
        generated.ticket.created_at,
        generated.ticket.updated_at
      )
  );

  for (const shard of generated.shards) {
    statements.push(
      db
        .prepare(
          `INSERT INTO mind_task_shards
           (id, parent_ticket_id, department, role_hint, summary, input_payload_json, priority, legacy_weight, created_at, decay_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
        )
        .bind(
          shard.id,
          shard.parent_ticket_id,
          shard.department,
          shard.role_hint ?? null,
          shard.summary,
          JSON.stringify(shard.input_payload ?? {}),
          shard.priority,
          shard.legacy_weight,
          shard.created_at,
          shard.decay_at ?? null
        )
    );
  }

  for (const event of generated.ticket.history) {
    let shardId: string | null = null;
    if (event.action === "assigned") {
      const match = /Assigned shard\s+([a-f0-9-]{36})\s+/i.exec(String(event.note || ""));
      shardId = match?.[1] || null;
    }

    statements.push(
      db
        .prepare(
          `INSERT INTO mind_ticket_events (ticket_id, shard_id, at, actor, action, note)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
        )
        .bind(generated.ticket.id, shardId, event.at, event.actor, event.action, event.note ?? null)
    );
  }

  for (const assignment of generated.assignmentPlan) {
    statements.push(
      db
        .prepare(
          `INSERT INTO mind_shard_assignments (ticket_id, shard_id, role, assigned_agent_id, assigned_at)
           VALUES (?1, ?2, ?3, ?4, ?5)`
        )
        .bind(generated.ticket.id, assignment.shard_id, assignment.role, assignment.assigned_agent_id, nowIso())
    );
  }

  await db.batch(statements);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/mind/shards/generate") {
      if (request.method !== "POST") {
        return Response.json(
          {
            ok: false,
            error: "Method Not Allowed"
          },
          {
            status: 405,
            headers: {
              Allow: "POST"
            }
          }
        );
      }

      const body = (await request.json().catch(() => null)) as GenerateTaskShardRequestBody | null;
      if (!body) {
        return Response.json(
          {
            ok: false,
            error: "Invalid JSON body"
          },
          { status: 400 }
        );
      }

      try {
        const result = generateTaskShardsFromBody(body);

        if (!env.ION_DB) {
          return Response.json(
            {
              ok: false,
              error: "ION_DB D1 binding is not configured for this worker"
            },
            { status: 503 }
          );
        }

        await persistTaskShardGeneration(env.ION_DB, result);

        return Response.json({
          ok: true,
          ticket: result.ticket,
          shards: result.shards,
          assignmentPlan: result.assignmentPlan,
          profileCount: BLACKWELL_AGENT_PROFILES.length,
          persisted: true
        });
      } catch (error: any) {
        const message = String(error?.message || "");
        if (message === "invalid-request") {
          return Response.json(
            {
              ok: false,
              error: "Missing or invalid fields. Required: title, summary, department(Research|Ops|Finance|Creative|Infra)."
            },
            { status: 400 }
          );
        }

        return Response.json(
          {
            ok: false,
            error: `Shard generation failed: ${String(error?.message || "unknown error")}`
          },
          { status: 500 }
        );
      }
    }

    if (url.pathname.startsWith("/api/image")) {
      return forward(request, env.IMAGES_SERVICE, env.IMAGES_URL, "/generate");
    }

    if (url.pathname.startsWith("/api/audio")) {
      return forward(request, env.AUDIO_SERVICE, env.AUDIO_URL, "/generate");
    }

    if (url.pathname.startsWith("/api/embed")) {
      return forward(request, env.EMBED_SERVICE, env.EMBED_URL, "/generate");
    }

    return new Response("ION Ai orchestrator online.");
  }
};

async function forward(
  request: Request,
  service: Fetcher | undefined,
  baseUrl: string,
  path: string,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  const upstreamBase = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!service && !upstreamBase) {
    return Response.json(
      {
        success: false,
        error: "Upstream worker URL is not configured"
      },
      { status: 503 }
    );
  }

  const method = request.method.toUpperCase();

  let bodyText = "";
  if (!["GET", "HEAD"].includes(method)) {
    bodyText = await request.text();
  }

  let upstreamResponse: Response;
  try {
    const headers = {
      "Content-Type": "application/json",
      ...extraHeaders
    };

    if (service) {
      upstreamResponse = await service.fetch("https://ION-internal" + path, {
        method,
        headers,
        body: bodyText || undefined
      });
    } else {
      const targetUrl = `${upstreamBase}${path}`;
      upstreamResponse = await fetch(targetUrl, {
        method,
        headers,
        body: bodyText || undefined
      });
    }
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: `Upstream request failed: ${String(error?.message || "network error")}`
      },
      { status: 502 }
    );
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: upstreamResponse.headers
  });
}
