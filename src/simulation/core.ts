export type SimulationActionKind = "stabilize" | "cooperate" | "compete" | "observe" | "recover";

export interface SimulationAction {
  agentId: string;
  kind: SimulationActionKind;
  intensity: number;
  rationale: string;
}

export interface AgentStateSnapshot {
  energy: number;
  influence: number;
  focus: number;
  stress: number;
  health: number;
}

export interface SimulationAgentSnapshot {
  id: string;
  traits: Record<string, number>;
  state: AgentStateSnapshot;
  memory: string[];
  goals: string[];
  lastAction?: SimulationActionKind;
}

export interface SimulationEnvironmentSnapshot {
  resources: number;
  institutions: number;
  rules: string[];
  time: number;
  globalStress: number;
  cooperationIndex: number;
}

export interface SimulationHistoryEntry {
  tick: number;
  summary: string;
  directives: string[];
  actions: SimulationAction[];
  environment: SimulationEnvironmentSnapshot;
}

export interface SimulationWorldSnapshot {
  agents: SimulationAgentSnapshot[];
  environment: SimulationEnvironmentSnapshot;
  history: SimulationHistoryEntry[];
  tick: number;
  version: number;
}

export interface ExternalSimulationInput {
  userIntent: string;
  directives: string[];
  injectedEvents?: string[];
  mode?: string;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function compactText(value: unknown, maxChars: number): string {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > maxChars ? `${text.slice(0, maxChars - 3)}...` : text;
}

export class SimulationEnvironment {
  resources: number;
  institutions: number;
  rules: string[];
  time: number;
  globalStress: number;
  cooperationIndex: number;

  constructor(snapshot: Partial<SimulationEnvironmentSnapshot> = {}) {
    this.resources = clamp(Number(snapshot.resources ?? 0.58));
    this.institutions = clamp(Number(snapshot.institutions ?? 0.62));
    this.rules = Array.isArray(snapshot.rules) && snapshot.rules.length
      ? snapshot.rules.map((rule) => compactText(rule, 140)).filter(Boolean).slice(0, 32)
      : [
          "domain: system-state",
          "time: linear",
          "entities: bounded",
          "transitions: deterministic-by-default",
          "logging: structured"
        ];
    this.time = Math.max(0, Math.floor(Number(snapshot.time ?? 0)));
    this.globalStress = clamp(Number(snapshot.globalStress ?? 0.38));
    this.cooperationIndex = clamp(Number(snapshot.cooperationIndex ?? 0.55));
  }

  recordRules(rules: string[]): void {
    if (!Array.isArray(rules) || rules.length === 0) return;
    this.rules = rules.map((rule) => compactText(rule, 140)).filter(Boolean).slice(0, 32);
  }

  applyActionFeedback(action: SimulationAction): void {
    const intensity = clamp(action.intensity);
    if (action.kind === "cooperate") {
      this.cooperationIndex = clamp(this.cooperationIndex + intensity * 0.05);
      this.globalStress = clamp(this.globalStress - intensity * 0.03);
      this.resources = clamp(this.resources + intensity * 0.02);
      return;
    }

    if (action.kind === "compete") {
      this.cooperationIndex = clamp(this.cooperationIndex - intensity * 0.05);
      this.globalStress = clamp(this.globalStress + intensity * 0.06);
      this.resources = clamp(this.resources - intensity * 0.02);
      return;
    }

    if (action.kind === "stabilize") {
      this.institutions = clamp(this.institutions + intensity * 0.03);
      this.globalStress = clamp(this.globalStress - intensity * 0.04);
      return;
    }

    if (action.kind === "recover") {
      this.resources = clamp(this.resources + intensity * 0.03);
      this.globalStress = clamp(this.globalStress - intensity * 0.02);
    }
  }

  applyGlobalEffects(agents: SimulationAgent[]): void {
    const scarcity = 1 - this.resources;
    const instability = 1 - this.institutions;
    const pressure = clamp((scarcity * 0.5) + (instability * 0.25) + (this.globalStress * 0.25));

    for (const agent of agents) {
      agent.state.stress = clamp(agent.state.stress + pressure * 0.08 - this.cooperationIndex * 0.03);
      agent.state.energy = clamp(agent.state.energy - scarcity * 0.04 + this.resources * 0.02);
      agent.state.focus = clamp(agent.state.focus - instability * 0.03 + this.institutions * 0.02);
      agent.state.health = clamp(agent.state.health - pressure * 0.03 + this.resources * 0.02);
    }
  }

  advanceTime(): void {
    this.time += 1;
    this.resources = clamp(this.resources - 0.005 + this.institutions * 0.003);
    this.globalStress = clamp(this.globalStress + (1 - this.cooperationIndex) * 0.01 - this.institutions * 0.005);
  }

  snapshot(): SimulationEnvironmentSnapshot {
    return {
      resources: Number(this.resources.toFixed(4)),
      institutions: Number(this.institutions.toFixed(4)),
      rules: [...this.rules],
      time: this.time,
      globalStress: Number(this.globalStress.toFixed(4)),
      cooperationIndex: Number(this.cooperationIndex.toFixed(4))
    };
  }
}

export class SimulationAgent {
  id: string;
  traits: Record<string, number>;
  state: AgentStateSnapshot;
  memory: string[];
  goals: string[];
  lastAction?: SimulationActionKind;

  constructor(snapshot: Partial<SimulationAgentSnapshot> & { id: string }) {
    this.id = compactText(snapshot.id, 64) || "agent";
    this.traits = Object.fromEntries(
      Object.entries(snapshot.traits || {}).map(([key, value]) => [key, clamp(Number(value || 0.5))])
    );
    this.state = {
      energy: clamp(Number(snapshot.state?.energy ?? 0.68)),
      influence: clamp(Number(snapshot.state?.influence ?? 0.5)),
      focus: clamp(Number(snapshot.state?.focus ?? 0.64)),
      stress: clamp(Number(snapshot.state?.stress ?? 0.34)),
      health: clamp(Number(snapshot.state?.health ?? 0.74))
    };
    this.memory = Array.isArray(snapshot.memory)
      ? snapshot.memory.map((entry) => compactText(entry, 180)).filter(Boolean).slice(-8)
      : [];
    this.goals = Array.isArray(snapshot.goals)
      ? snapshot.goals.map((goal) => compactText(goal, 120)).filter(Boolean).slice(-5)
      : [];
    this.lastAction = snapshot.lastAction;
  }

  decide(environment: SimulationEnvironment, input: ExternalSimulationInput): SimulationAction {
    const intent = compactText(input.userIntent, 160).toLowerCase();
    const directives = input.directives.join(" ").toLowerCase();
    const cooperativeBias = clamp((this.traits.cooperation ?? 0.5) + environment.cooperationIndex * 0.2);
    const resilience = clamp(this.traits.resilience ?? 0.5);

    let kind: SimulationActionKind = "observe";
    if (this.state.stress > 0.72 || environment.globalStress > 0.74) {
      kind = resilience > 0.6 ? "stabilize" : "recover";
    } else if (/\b(recover|stabilize|repair|heal)\b/.test(intent) || /\bstability\b/.test(directives)) {
      kind = "stabilize";
    } else if (/\b(compete|conflict|pressure|race)\b/.test(intent)) {
      kind = "compete";
    } else if (/\b(cooperate|align|treaty|collaborate|consensus)\b/.test(intent) || cooperativeBias >= 0.62) {
      kind = "cooperate";
    } else if (environment.resources < 0.32 || this.state.energy < 0.3) {
      kind = "recover";
    }

    const intensity = clamp((this.state.focus * 0.35) + (this.state.energy * 0.35) + (1 - this.state.stress) * 0.3);
    return {
      agentId: this.id,
      kind,
      intensity: Number(intensity.toFixed(4)),
      rationale: compactText(`intent=${intent || "none"}; directives=${directives || "none"}; cooperation=${cooperativeBias.toFixed(2)}`, 200)
    };
  }

  applyAction(action: SimulationAction, environment: SimulationEnvironment): void {
    const intensity = clamp(action.intensity);
    this.lastAction = action.kind;

    if (action.kind === "cooperate") {
      this.state.influence = clamp(this.state.influence + intensity * 0.05);
      this.state.stress = clamp(this.state.stress - intensity * 0.04);
      this.state.focus = clamp(this.state.focus + intensity * 0.03);
    } else if (action.kind === "compete") {
      this.state.influence = clamp(this.state.influence + intensity * 0.07);
      this.state.stress = clamp(this.state.stress + intensity * 0.06);
      this.state.energy = clamp(this.state.energy - intensity * 0.05);
    } else if (action.kind === "stabilize") {
      this.state.focus = clamp(this.state.focus + intensity * 0.04);
      this.state.stress = clamp(this.state.stress - intensity * 0.06);
      this.state.health = clamp(this.state.health + intensity * 0.03);
    } else if (action.kind === "recover") {
      this.state.energy = clamp(this.state.energy + intensity * 0.06);
      this.state.health = clamp(this.state.health + intensity * 0.04);
      this.state.stress = clamp(this.state.stress - intensity * 0.05);
    } else {
      this.state.focus = clamp(this.state.focus + intensity * 0.01);
    }

    this.memory.push(compactText(`t${environment.time}:${action.kind}:${action.rationale}`, 180));
    this.memory = this.memory.slice(-8);
  }

  updateInternalState(environment: SimulationEnvironment): void {
    this.state.energy = clamp(this.state.energy - environment.globalStress * 0.01 + environment.resources * 0.015);
    this.state.focus = clamp(this.state.focus + environment.institutions * 0.01 - environment.globalStress * 0.01);
    this.state.health = clamp(this.state.health + environment.resources * 0.01 - environment.globalStress * 0.015);
  }

  snapshot(): SimulationAgentSnapshot {
    return {
      id: this.id,
      traits: { ...this.traits },
      state: {
        energy: Number(this.state.energy.toFixed(4)),
        influence: Number(this.state.influence.toFixed(4)),
        focus: Number(this.state.focus.toFixed(4)),
        stress: Number(this.state.stress.toFixed(4)),
        health: Number(this.state.health.toFixed(4))
      },
      memory: [...this.memory],
      goals: [...this.goals],
      lastAction: this.lastAction
    };
  }
}

export class SimulationWorld {
  agents: SimulationAgent[];
  environment: SimulationEnvironment;
  history: SimulationHistoryEntry[];
  tick: number;
  version: number;

  constructor(snapshot?: Partial<SimulationWorldSnapshot>) {
    this.agents = Array.isArray(snapshot?.agents) && snapshot?.agents.length
      ? snapshot.agents.map((agent) => new SimulationAgent(agent))
      : [];
    this.environment = new SimulationEnvironment(snapshot?.environment || {});
    this.history = Array.isArray(snapshot?.history) ? [...snapshot.history].slice(-24) : [];
    this.tick = Math.max(0, Math.floor(Number(snapshot?.tick ?? 0)));
    this.version = Math.max(1, Math.floor(Number(snapshot?.version ?? 1)));
  }

  applyActions(actions: SimulationAction[]): void {
    for (const action of actions) {
      const agent = this.agents.find((entry) => entry.id === action.agentId);
      if (!agent) continue;
      agent.applyAction(action, this.environment);
      this.environment.applyActionFeedback(action);
    }
  }

  appendHistory(entry: SimulationHistoryEntry): void {
    this.history.push(entry);
    this.history = this.history.slice(-24);
  }

  snapshot(): SimulationWorldSnapshot {
    return {
      agents: this.agents.map((agent) => agent.snapshot()),
      environment: this.environment.snapshot(),
      history: this.history.map((entry) => ({
        tick: entry.tick,
        summary: entry.summary,
        directives: [...entry.directives],
        actions: entry.actions.map((action) => ({ ...action })),
        environment: { ...entry.environment, rules: [...entry.environment.rules] }
      })),
      tick: this.tick,
      version: this.version
    };
  }

  static fromSnapshot(snapshot?: Partial<SimulationWorldSnapshot>): SimulationWorld {
    return new SimulationWorld(snapshot);
  }
}

function summarizeActions(actions: SimulationAction[]): string {
  if (!actions.length) return "No actions executed.";
  return actions.map((action) => `${action.agentId}:${action.kind}@${action.intensity.toFixed(2)}`).join(", ");
}

export function summarizeWorld(snapshot: SimulationWorldSnapshot): string {
  const environment = snapshot.environment;
  const topAgents = snapshot.agents.slice(0, 4).map((agent) => {
    return `${agent.id}(energy=${agent.state.energy.toFixed(2)},stress=${agent.state.stress.toFixed(2)},focus=${agent.state.focus.toFixed(2)},last=${agent.lastAction || "none"})`;
  });

  return [
    `tick=${snapshot.tick}`,
    `time=${environment.time}`,
    `resources=${environment.resources.toFixed(2)}`,
    `institutions=${environment.institutions.toFixed(2)}`,
    `globalStress=${environment.globalStress.toFixed(2)}`,
    `cooperation=${environment.cooperationIndex.toFixed(2)}`,
    topAgents.length ? `agents=${topAgents.join("; ")}` : "agents=none"
  ].join(" | ");
}

export class SimulationEngine {
  bootstrapWorld(seed: Partial<SimulationWorldSnapshot> & { rules?: string[] } = {}): SimulationWorld {
    const world = new SimulationWorld({
      ...seed,
      version: Math.max(1, Math.floor(Number(seed.version ?? 1))),
      agents: Array.isArray(seed.agents) && seed.agents.length
        ? seed.agents
        : [
            {
              id: "operator",
              traits: { cooperation: 0.64, resilience: 0.58 },
              state: { energy: 0.7, influence: 0.46, focus: 0.69, stress: 0.31, health: 0.76 },
              goals: ["maintain coherence", "reduce drift"],
              memory: []
            },
            {
              id: "system",
              traits: { cooperation: 0.71, resilience: 0.67 },
              state: { energy: 0.74, influence: 0.63, focus: 0.72, stress: 0.28, health: 0.81 },
              goals: ["preserve stability", "apply rules"],
              memory: []
            }
          ]
    });

    if (Array.isArray(seed.rules) && seed.rules.length) {
      world.environment.recordRules(seed.rules);
    }

    return world;
  }

  runStep(world: SimulationWorld, input: ExternalSimulationInput): SimulationWorld {
    const directives = Array.isArray(input.directives)
      ? input.directives.map((entry) => compactText(entry, 140)).filter(Boolean).slice(0, 16)
      : [];
    world.environment.recordRules(directives.length ? directives : world.environment.rules);

    const actions = world.agents.map((agent) => agent.decide(world.environment, input));
    world.applyActions(actions);
    world.environment.applyGlobalEffects(world.agents);
    world.environment.advanceTime();
    for (const agent of world.agents) {
      agent.updateInternalState(world.environment);
    }

    world.tick += 1;
    world.appendHistory({
      tick: world.tick,
      summary: compactText(`intent=${input.userIntent || "none"}; actions=${summarizeActions(actions)}`, 220),
      directives,
      actions,
      environment: world.environment.snapshot()
    });

    if (Array.isArray(input.injectedEvents)) {
      for (const event of input.injectedEvents) {
        this.injectEvent(world, event);
      }
    }

    return world;
  }

  injectEvent(world: SimulationWorld, description: string): void {
    const summary = compactText(description, 220);
    if (!summary) return;
    world.appendHistory({
      tick: world.tick,
      summary: `event:${summary}`,
      directives: [],
      actions: [],
      environment: world.environment.snapshot()
    });
  }

  serialize(world: SimulationWorld): SimulationWorldSnapshot {
    return world.snapshot();
  }

  deserialize(snapshot?: Partial<SimulationWorldSnapshot>): SimulationWorld {
    const world = SimulationWorld.fromSnapshot(snapshot);
    if (world.agents.length > 0) return world;
    return this.bootstrapWorld(snapshot || {});
  }
}