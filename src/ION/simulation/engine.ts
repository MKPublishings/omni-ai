import type { KVNamespace } from "@cloudflare/workers-types";
import {
  SimulationEngine,
  summarizeWorld,
  type SimulationHistoryEntry,
  type ExternalSimulationInput,
  type SimulationWorldSnapshot
} from "../../simulation/index.ts";

type SimulationStatus = "active" | "paused" | "stopped" | "completed";

type SimulationLogEntry = {
  ts: number;
  level: "info" | "warn";
  message: string;
};

export type SimulationResults = {
  summary: string;
  latestTransition: string;
  progressLabel: string;
  environment: SimulationWorldSnapshot["environment"];
  topAgents: Array<{
    id: string;
    energy: number;
    stress: number;
    focus: number;
    influence: number;
    health: number;
    lastAction?: string;
  }>;
  recentHistory: SimulationHistoryEntry[];
};

export type SimulationExportPayload = {
  simulationId: string;
  sessionId: string;
  status: SimulationStatus;
  exportedAt: number;
  fileName: string;
  progress: {
    stepsExecuted: number;
    targetSteps: number;
    completionPercentage: number;
  };
  state: SimulationState;
  results: SimulationResults;
  chatReport: string;
};

export type SimulationState = {
  sessionId: string;
  simulationId: string;
  status: SimulationStatus;
  stepsExecuted: number;
  targetSteps: number;
  completionPercentage: number;
  lastProgressLogPercentage: number;
  rules: string[];
  resultSummary: string;
  memoryUsageBytes: number;
  world: SimulationWorldSnapshot;
  logs: SimulationLogEntry[];
  updatedAt: number;
};

type SimulationMessage = {
  role?: string;
  content?: string;
};

type SimulationEnv = {
  MEMORY?: KVNamespace;
};

export type SimulationStorageOptions = {
  sessionId?: string;
};

export type SimulationContext = {
  state: SimulationState;
  systemPrompt: string;
  logsSummary: string;
  statusSummary: string;
  chatSummary: string;
  exportPayload: SimulationExportPayload;
};

const MAX_LOG_ENTRIES = 24;
const DEFAULT_SESSION_ID = "anon";
const DEFAULT_TARGET_STEPS = 12;
const DEFAULT_BATCH_STEPS = 1;
const START_BATCH_STEPS = 3;
const MAX_TARGET_STEPS = 400;
const MAX_BATCH_STEPS = 48;
const SIMULATION_ENGINE = new SimulationEngine();
const DEFAULT_RULES = [
  "domain: system-state",
  "time: linear",
  "entities: bounded",
  "transitions: deterministic-by-default",
  "logging: structured"
];

function nowTs() {
  return Date.now();
}

function createSimulationId(sessionIdRaw?: string): string {
  return `sim_${normalizeSessionId(sessionIdRaw)}_${nowTs()}`;
}

function normalizeSessionId(value: unknown): string {
  return String(value || DEFAULT_SESSION_ID).replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 120) || DEFAULT_SESSION_ID;
}

function buildSimulationMemoryKey(sessionIdRaw?: string): string {
  return `ION:simulation:state:${normalizeSessionId(sessionIdRaw)}`;
}

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(numeric)));
}

function computeCompletionPercentage(stepsExecuted: number, targetSteps: number): number {
  if (targetSteps <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, stepsExecuted / targetSteps));
  return Math.round(ratio * 100);
}

function progressLabel(state: Pick<SimulationState, "stepsExecuted" | "targetSteps" | "completionPercentage">): string {
  return `${state.completionPercentage}% (${state.stepsExecuted}/${state.targetSteps} steps)`;
}

function parseRuleLines(raw: string): string[] {
  const source = normalizeText(raw);
  if (!source) return [];

  return source
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 32);
}

function buildExternalInput(messages: SimulationMessage[]): ExternalSimulationInput {
  const latestUserMessage = [...(messages || [])]
    .reverse()
    .find((message) => String(message?.role || "").toLowerCase() === "user");

  const userIntent = normalizeText(latestUserMessage?.content);
  const directives = extractRulesFromMessages(messages);
  const injectedEvents = [
    ...(userIntent ? [userIntent] : [])
  ].slice(0, 2);

  return {
    userIntent,
    directives,
    injectedEvents,
    mode: "simulation"
  };
}

type SimulationControlAction = "start" | "pause" | "stop" | "reset" | "none";

type ParsedSimulationCommand = {
  action: SimulationControlAction;
  targetSteps?: number;
  batchSteps?: number;
  reportOnly: boolean;
  exportRequested: boolean;
  writeResultsRequested: boolean;
};

function getLatestUserMessage(messages: SimulationMessage[]): string {
  const latestUserMessage = [...(messages || [])]
    .reverse()
    .find((message) => String(message?.role || "").toLowerCase() === "user");

  return String(latestUserMessage?.content || "");
}

function parseSimulationCommand(messages: SimulationMessage[]): ParsedSimulationCommand {
  const raw = getLatestUserMessage(messages);
  const text = raw.toLowerCase();
  const naturalRunIntent = /\b(simulate|stress[ -]?test|play out|run through|step through|forecast|project forward|model(?: this| the| a)?)\b/.test(text);
  const reportOrExportIntent = /\b(status|progress|completion|current state|how far|where are we|what step|export|download)\b/.test(text);

  let action: SimulationControlAction = "none";
  if (/(reset simulation|\/simulation\s+reset|restart simulation|terminate simulation)\b/.test(text)) {
    action = "reset";
  } else if (/(stop simulation|\/simulation\s+stop|end simulation|halt simulation)\b/.test(text)) {
    action = "stop";
  } else if (/(pause simulation|\/simulation\s+pause)\b/.test(text)) {
    action = "pause";
  } else if (/(start simulation|resume simulation|continue simulation|run simulation|\/simulation\s+start|\/simulation\s+resume)\b/.test(text)) {
    action = "start";
  } else if (naturalRunIntent && !reportOrExportIntent) {
    action = "start";
  }

  const targetMatch =
    text.match(/(?:\/simulation\s+target\s+|target(?:ing)?\s+|complete(?:\s+in)?\s+)(\d{1,4})\s*steps?\b/i) ||
    text.match(/\b(?:for|over|across|within|through)\s+(\d{1,4})\s*steps?\b/i);
  const batchMatch = text.match(/(?:\/simulation\s+(?:run|step|advance)\s+|(?:run|advance|step(?:\s+through)?|process|continue|resume)\s+(?:by\s+)?)\s*(\d{1,3})\s*(?:more\s+)?steps?\b/i);
  const targetSteps = targetMatch ? clampInteger(targetMatch[1], 1, MAX_TARGET_STEPS, DEFAULT_TARGET_STEPS) : undefined;
  const batchSteps = batchMatch ? clampInteger(batchMatch[1], 1, MAX_BATCH_STEPS, DEFAULT_BATCH_STEPS) : undefined;

  const exportRequested = /(export simulation|export results|download simulation|\/simulation\s+export)\b/.test(text);
  const writeResultsRequested = /\b(write out (?:the )?results|show (?:the )?results|summari[sz]e (?:the )?results|report (?:the )?results)\b/.test(text);
  const progressRequested = /\b(status|progress|completion|current state|how far|where are we|what step)\b/.test(text);
  const runIntent = /\b(run|advance|step|process|continue|resume|start|simulate|forecast|model|stress[ -]?test|play out|run through|step through)\b/.test(text);
  const reportOnly = (exportRequested || writeResultsRequested || progressRequested) && !runIntent && action === "none";

  return {
    action,
    targetSteps,
    batchSteps,
    reportOnly,
    exportRequested,
    writeResultsRequested
  };
}

function extractRulesFromMessages(messages: SimulationMessage[]): string[] {
  const userMessages = (messages || [])
    .filter((m) => String(m?.role || "").toLowerCase() === "user")
    .map((m) => String(m?.content || ""));

  for (let i = userMessages.length - 1; i >= 0; i -= 1) {
    const content = userMessages[i];
    const blockMatch = content.match(/rules\s*:\s*([\s\S]+)/i);
    if (!blockMatch) continue;

    const parsed = parseRuleLines(blockMatch[1]);
    if (parsed.length) return parsed;
  }

  return [];
}

function estimateMemoryUsageBytes(state: Omit<SimulationState, "memoryUsageBytes">): number {
  try {
    return new TextEncoder().encode(JSON.stringify(state)).length;
  } catch {
    return JSON.stringify(state).length;
  }
}

function buildResults(state: SimulationState): SimulationResults {
  const latestTransition = normalizeText(state.world.history.at(-1)?.summary) || "No transitions have been executed yet.";
  const topAgents = [...state.world.agents]
    .sort((left, right) => right.state.influence - left.state.influence)
    .slice(0, 3)
    .map((agent) => ({
      id: agent.id,
      energy: agent.state.energy,
      stress: agent.state.stress,
      focus: agent.state.focus,
      influence: agent.state.influence,
      health: agent.state.health,
      lastAction: agent.lastAction
    }));

  return {
    summary: state.resultSummary || summarizeWorld(state.world),
    latestTransition,
    progressLabel: progressLabel(state),
    environment: { ...state.world.environment, rules: [...state.world.environment.rules] },
    topAgents,
    recentHistory: state.world.history.slice(-5).map((entry) => ({
      tick: entry.tick,
      summary: entry.summary,
      directives: [...entry.directives],
      actions: entry.actions.map((action) => ({ ...action })),
      environment: { ...entry.environment, rules: [...entry.environment.rules] }
    }))
  };
}

function buildResultSummary(state: SimulationState): string {
  const environment = state.world.environment;
  const latestTransition = normalizeText(state.world.history.at(-1)?.summary) || "awaiting first transition";
  return [
    `Status ${state.status}.`,
    `Progress ${progressLabel(state)}.`,
    `Resources ${environment.resources.toFixed(2)}, institutions ${environment.institutions.toFixed(2)}, global stress ${environment.globalStress.toFixed(2)}, cooperation ${environment.cooperationIndex.toFixed(2)}.`,
    `Latest transition: ${latestTransition}`
  ].join(" ");
}

function buildChatReport(state: SimulationState): string {
  const results = buildResults(state);
  const topAgents = results.topAgents.length
    ? results.topAgents
        .map((agent) => `${agent.id}(energy=${agent.energy.toFixed(2)}, stress=${agent.stress.toFixed(2)}, focus=${agent.focus.toFixed(2)}, last=${agent.lastAction || "none"})`)
        .join("; ")
    : "none";

  return [
    `Simulation ${state.simulationId}`,
    `Status: ${state.status}`,
    `Progress: ${results.progressLabel}`,
    `Summary: ${results.summary}`,
    `Latest transition: ${results.latestTransition}`,
    `Top agents: ${topAgents}`,
    "Controls: /simulation start, /simulation pause, /simulation stop, /simulation reset, /simulation target <steps>, /simulation advance <steps>",
    "Export: simulation state and results are available for chat output and JSON download."
  ].join("\n");
}

function buildExportPayload(state: SimulationState): SimulationExportPayload {
  return {
    simulationId: state.simulationId,
    sessionId: state.sessionId,
    status: state.status,
    exportedAt: nowTs(),
    fileName: `simulation-${state.simulationId}.json`,
    progress: {
      stepsExecuted: state.stepsExecuted,
      targetSteps: state.targetSteps,
      completionPercentage: state.completionPercentage
    },
    state: {
      ...state,
      rules: [...state.rules],
      world: {
        ...state.world,
        environment: { ...state.world.environment, rules: [...state.world.environment.rules] },
        history: state.world.history.map((entry) => ({
          tick: entry.tick,
          summary: entry.summary,
          directives: [...entry.directives],
          actions: entry.actions.map((action) => ({ ...action })),
          environment: { ...entry.environment, rules: [...entry.environment.rules] }
        })),
        agents: state.world.agents.map((agent) => ({
          ...agent,
          traits: { ...agent.traits },
          state: { ...agent.state },
          memory: [...agent.memory],
          goals: [...agent.goals]
        }))
      },
      logs: state.logs.map((log) => ({ ...log }))
    },
    results: buildResults(state),
    chatReport: buildChatReport(state)
  };
}

function refreshDerivedState(state: SimulationState): void {
  state.targetSteps = Math.max(1, state.targetSteps || DEFAULT_TARGET_STEPS);
  state.completionPercentage = computeCompletionPercentage(state.stepsExecuted, state.targetSteps);
  state.resultSummary = buildResultSummary(state);
  if (state.stepsExecuted >= state.targetSteps && state.status === "active") {
    state.status = "completed";
  }
}

function makeInitialState(sessionIdRaw?: string): SimulationState {
  const sessionId = normalizeSessionId(sessionIdRaw);
  const world = SIMULATION_ENGINE.serialize(SIMULATION_ENGINE.bootstrapWorld({ rules: DEFAULT_RULES }));
  const base: Omit<SimulationState, "memoryUsageBytes"> = {
    sessionId,
    simulationId: createSimulationId(sessionId),
    status: "active",
    stepsExecuted: 0,
    targetSteps: DEFAULT_TARGET_STEPS,
    completionPercentage: 0,
    lastProgressLogPercentage: 0,
    rules: [...DEFAULT_RULES],
    resultSummary: "Simulation initialized. No steps executed yet.",
    world,
    logs: [{ ts: nowTs(), level: "info", message: "Simulation initialized" }],
    updatedAt: nowTs()
  };

  return {
    ...base,
    memoryUsageBytes: estimateMemoryUsageBytes(base)
  };
}

async function loadState(env: SimulationEnv, options: SimulationStorageOptions = {}): Promise<SimulationState> {
  const sessionId = normalizeSessionId(options.sessionId);
  if (!env.MEMORY?.get) return makeInitialState(sessionId);

  try {
    const stored = await env.MEMORY.get(buildSimulationMemoryKey(sessionId), "json");
    if (!stored || typeof stored !== "object") return makeInitialState(sessionId);

    const state = stored as Partial<SimulationState>;
    const fallback = makeInitialState(sessionId);

    const normalized: SimulationState = {
      sessionId,
      simulationId: normalizeText(state.simulationId) || fallback.simulationId,
      status:
        state.status === "paused" || state.status === "stopped" || state.status === "completed"
          ? state.status
          : "active",
      stepsExecuted: Number.isFinite(state.stepsExecuted) ? Math.max(0, Number(state.stepsExecuted)) : 0,
      targetSteps: clampInteger(state.targetSteps, 1, MAX_TARGET_STEPS, fallback.targetSteps),
      completionPercentage: clampInteger(state.completionPercentage, 0, 100, 0),
      lastProgressLogPercentage: clampInteger(state.lastProgressLogPercentage, 0, 100, 0),
      rules: Array.isArray(state.rules) && state.rules.length
        ? state.rules.map((rule) => normalizeText(rule)).filter(Boolean).slice(0, 32)
        : [...DEFAULT_RULES],
      resultSummary: normalizeText(state.resultSummary) || fallback.resultSummary,
      memoryUsageBytes: Number.isFinite(state.memoryUsageBytes) ? Math.max(0, Number(state.memoryUsageBytes)) : 0,
      world: typeof state.world === "object" && state.world
        ? SIMULATION_ENGINE.serialize(SIMULATION_ENGINE.deserialize(state.world as Partial<SimulationWorldSnapshot>))
        : SIMULATION_ENGINE.serialize(SIMULATION_ENGINE.bootstrapWorld({ rules: [...DEFAULT_RULES] })),
      logs: Array.isArray(state.logs)
        ? state.logs
            .map((log) => ({
              ts: Number.isFinite(log?.ts) ? Number(log.ts) : nowTs(),
              level: (log?.level === "warn" ? "warn" : "info") as "info" | "warn",
              message: normalizeText(log?.message)
            }))
            .filter((log) => !!log.message)
            .slice(-MAX_LOG_ENTRIES)
        : [...fallback.logs],
      updatedAt: Number.isFinite(state.updatedAt) ? Number(state.updatedAt) : nowTs()
    };

    refreshDerivedState(normalized);

    const recalcMemory = estimateMemoryUsageBytes({
      sessionId: normalized.sessionId,
      simulationId: normalized.simulationId,
      status: normalized.status,
      stepsExecuted: normalized.stepsExecuted,
      targetSteps: normalized.targetSteps,
      completionPercentage: normalized.completionPercentage,
      lastProgressLogPercentage: normalized.lastProgressLogPercentage,
      rules: normalized.rules,
      resultSummary: normalized.resultSummary,
      world: normalized.world,
      logs: normalized.logs,
      updatedAt: normalized.updatedAt
    });

    normalized.memoryUsageBytes = recalcMemory;
    return normalized;
  } catch {
    return makeInitialState(sessionId);
  }
}

async function saveState(env: SimulationEnv, state: SimulationState): Promise<void> {
  if (!env.MEMORY?.put) return;
  await env.MEMORY.put(buildSimulationMemoryKey(state.sessionId), JSON.stringify(state));
}

function appendLog(state: SimulationState, level: "info" | "warn", message: string) {
  state.logs.push({ ts: nowTs(), level, message });
  state.logs = state.logs.slice(-MAX_LOG_ENTRIES);
}

function buildStatusSummary(state: SimulationState): string {
  return [
    `Simulation ID: ${state.simulationId}`,
    `Session: ${state.sessionId}`,
    `Status: ${state.status}`,
    `Progress: ${progressLabel(state)}`,
    `Summary: ${state.resultSummary}`,
    `Rules in effect: ${state.rules.join(" | ")}`
  ].join("\n");
}

function buildSystemPrompt(state: SimulationState): string {
  return [
    "You are ION in Simulation Mode.",
    "Simulation profile: system-state simulator.",
    "Operate as a contained reality engine with strict rule adherence.",
    "Treat natural-language requests such as simulate, stress test, play out, run through, forecast, or scenario analysis as valid simulation directives.",
    "If exact rules are missing, infer the minimum conservative assumptions needed to produce a result and label them clearly.",
    "Output must include: current lifecycle state, percent complete, key transitions, concise simulation log entries, and a note that exportable results are available.",
    `Simulation ID: ${state.simulationId}`,
    `Session ID: ${state.sessionId}`,
    `Status: ${state.status}`,
    `Steps Executed: ${state.stepsExecuted}`,
    `Target Steps: ${state.targetSteps}`,
    `Completion: ${state.completionPercentage}%`,
    `World Snapshot: ${summarizeWorld(state.world)}`,
    "Rules:",
    ...state.rules.map((rule, index) => `${index + 1}. ${rule}`)
  ].join("\n");
}

function buildLogsSummary(state: SimulationState): string {
  const recent = state.logs.slice(-8);
  if (!recent.length) return "No simulation logs yet.";

  return recent
    .map((log) => {
      const stamp = new Date(log.ts).toISOString();
      return `[${stamp}] ${log.level.toUpperCase()}: ${log.message}`;
    })
    .join("\n");
}

function buildBatchSize(state: SimulationState, command: ParsedSimulationCommand): number {
  const remaining = Math.max(0, state.targetSteps - state.stepsExecuted);
  if (remaining <= 0) return 0;
  const requested = command.batchSteps ?? (command.action === "start" ? START_BATCH_STEPS : DEFAULT_BATCH_STEPS);
  return Math.min(remaining, clampInteger(requested, 1, MAX_BATCH_STEPS, DEFAULT_BATCH_STEPS));
}

export async function readSimulationState(env: SimulationEnv, options: SimulationStorageOptions = {}): Promise<SimulationState> {
  const state = await loadState(env, options);
  refreshDerivedState(state);
  state.memoryUsageBytes = estimateMemoryUsageBytes({
    sessionId: state.sessionId,
    simulationId: state.simulationId,
    status: state.status,
    stepsExecuted: state.stepsExecuted,
    targetSteps: state.targetSteps,
    completionPercentage: state.completionPercentage,
    lastProgressLogPercentage: state.lastProgressLogPercentage,
    rules: state.rules,
    resultSummary: state.resultSummary,
    world: state.world,
    logs: state.logs,
    updatedAt: state.updatedAt
  });
  return state;
}

export async function exportSimulationState(
  env: SimulationEnv,
  options: SimulationStorageOptions = {}
): Promise<SimulationExportPayload> {
  return buildExportPayload(await readSimulationState(env, options));
}

export async function advanceSimulationState(
  env: SimulationEnv,
  messages: SimulationMessage[],
  options: SimulationStorageOptions = {}
): Promise<SimulationContext> {
  const state = await loadState(env, options);
  const incomingRules = extractRulesFromMessages(messages);
  if (incomingRules.length) {
    state.rules = incomingRules;
    state.world.environment.rules = [...incomingRules];
    appendLog(state, "info", `Rules updated (${incomingRules.length})`);
  }

  const command = parseSimulationCommand(messages);
  if (command.targetSteps) {
    state.targetSteps = Math.max(1, Math.min(MAX_TARGET_STEPS, command.targetSteps));
    appendLog(state, "info", `Target steps set to ${state.targetSteps}`);
  }

  refreshDerivedState(state);

  const action = command.action;
  if (action === "reset") {
    state.simulationId = createSimulationId(state.sessionId);
    state.status = "active";
    state.stepsExecuted = 0;
    state.completionPercentage = 0;
    state.lastProgressLogPercentage = 0;
    state.rules = incomingRules.length ? incomingRules : [...DEFAULT_RULES];
    state.targetSteps = command.targetSteps || DEFAULT_TARGET_STEPS;
    state.world = SIMULATION_ENGINE.serialize(SIMULATION_ENGINE.bootstrapWorld({ rules: state.rules }));
    state.logs = [];
    appendLog(state, "warn", "Simulation reset from command");
  } else if (action === "pause") {
    state.status = "paused";
    appendLog(state, "info", "Simulation paused");
  } else if (action === "stop") {
    state.status = "stopped";
    appendLog(state, "warn", `Simulation stopped at ${progressLabel(state)}`);
  } else if (action === "start") {
    if (state.stepsExecuted >= state.targetSteps && !command.targetSteps) {
      state.status = "completed";
      appendLog(state, "warn", "Simulation is already complete. Use /simulation reset or raise the target steps to continue.");
    } else {
      state.status = "active";
      appendLog(state, "info", "Simulation started");
    }
  }

  refreshDerivedState(state);

  const shouldAdvance = state.status === "active" && !command.reportOnly && action !== "stop" && action !== "pause";
  if (shouldAdvance) {
    const world = SIMULATION_ENGINE.deserialize(state.world);
    const batchSize = buildBatchSize(state, command);

    for (let index = 0; index < batchSize; index += 1) {
      const nextWorld = SIMULATION_ENGINE.runStep(world, buildExternalInput(messages));
      state.world = SIMULATION_ENGINE.serialize(nextWorld);
      state.stepsExecuted = nextWorld.tick;
      refreshDerivedState(state);
      appendLog(
        state,
        "info",
        `Executed step ${state.stepsExecuted}/${state.targetSteps} (${state.completionPercentage}%): ${nextWorld.history.at(-1)?.summary || "no summary"}`
      );

      if (state.completionPercentage === 100) {
        state.status = "completed";
        appendLog(state, "info", "Simulation completed and ready for export");
        break;
      }
    }
  } else if (command.exportRequested || command.writeResultsRequested || command.reportOnly) {
    appendLog(state, "info", `Simulation report requested at ${progressLabel(state)}`);
  }

  refreshDerivedState(state);

  state.updatedAt = nowTs();
  state.memoryUsageBytes = estimateMemoryUsageBytes({
    sessionId: state.sessionId,
    simulationId: state.simulationId,
    status: state.status,
    stepsExecuted: state.stepsExecuted,
    targetSteps: state.targetSteps,
    completionPercentage: state.completionPercentage,
    lastProgressLogPercentage: state.lastProgressLogPercentage,
    rules: state.rules,
    resultSummary: state.resultSummary,
    world: state.world,
    logs: state.logs,
    updatedAt: state.updatedAt
  });

  await saveState(env, state);

  return {
    state,
    systemPrompt: buildSystemPrompt(state),
    logsSummary: buildLogsSummary(state),
    statusSummary: buildStatusSummary(state),
    chatSummary: buildChatReport(state),
    exportPayload: buildExportPayload(state)
  };
}
