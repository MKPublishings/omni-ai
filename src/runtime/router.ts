export type RuntimeCapability = "chat" | "simulation-assist" | "tooling";

export interface RuntimeProviderPolicy {
  primaryModel: string;
  fallbackModel: string;
  constraints: string[];
}

export interface RuntimeRouteDecision {
  capability: RuntimeCapability;
  selectedModel: string;
  fallbackModel: string;
  reason: string;
  policy: RuntimeProviderPolicy;
}

export interface RuntimeRouterInput {
  mode: string;
  latestUserText: string;
  requestedModel?: string;
  hasSimulationContext?: boolean;
}

type RouterEnv = {
  MODEL_OMNI?: string;
  MODEL_SIMULATION?: string;
};

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function defaultModel(env: RouterEnv): string {
  return normalizeText(env.MODEL_OMNI) || "@cf/meta/llama-3.1-8b-instruct";
}

export function resolveRuntimeRoute(input: RuntimeRouterInput, env: RouterEnv): RuntimeRouteDecision {
  const requested = normalizeText(input.requestedModel).toLowerCase();
  const mode = normalizeText(input.mode).toLowerCase();
  const text = normalizeText(input.latestUserText).toLowerCase();
  const baseModel = defaultModel(env);
  const simulationModel = normalizeText(env.MODEL_SIMULATION) || baseModel;

  let capability: RuntimeCapability = "chat";
  let selectedModel = requested && requested !== "omni" ? requested : baseModel;
  let fallbackModel = baseModel;
  let reason = requested && requested !== "omni" ? "explicit-model-request" : "default-primary-model";
  const constraints = ["single-authoritative-runtime", "ts-first-control-loop"];

  if (mode === "simulation" || input.hasSimulationContext) {
    capability = "simulation-assist";
    selectedModel = simulationModel;
    fallbackModel = baseModel;
    reason = "simulation-mode-policy";
    constraints.push("simulation-aware-response");
  } else if (/\b(tool|execute|call tool|run tool)\b/.test(text)) {
    capability = "tooling";
    selectedModel = baseModel;
    fallbackModel = baseModel;
    reason = "tooling-intent-policy";
    constraints.push("tool-safe-response");
  } else if (/\b(plan|architecture|systems|migration|integration)\b/.test(text)) {
    reason = "systems-reasoning-policy";
    constraints.push("high-structure-response");
  }

  return {
    capability,
    selectedModel,
    fallbackModel,
    reason,
    policy: {
      primaryModel: selectedModel,
      fallbackModel,
      constraints
    }
  };
}