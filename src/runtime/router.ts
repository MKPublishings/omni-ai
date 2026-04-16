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
  MODEL_ION?: string;
  MODEL_SIMULATION?: string;
};

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function defaultModel(env: RouterEnv): string {
  return normalizeText(env.MODEL_ION) || "@cf/meta/llama-3.1-8b-instruct";
}

export function resolveRuntimeRoute(input: RuntimeRouterInput, env: RouterEnv): RuntimeRouteDecision {
  const requested = normalizeText(input.requestedModel);
  const requestedNormalized = requested.toLowerCase();
  const mode = normalizeText(input.mode).toLowerCase();
  const text = normalizeText(input.latestUserText).toLowerCase();
  const baseModel = defaultModel(env);
  const simulationModel = normalizeText(env.MODEL_SIMULATION) || baseModel;
  const hasSimulationIntent = /\b(simulate|simulation|scenario|stress[ -]?test|play out|run through|step through|forecast|project forward|model(?: this| the| a)?|counterfactual|what if)\b/.test(text);
  const hasCosmicIntent = /\b(cosmic|galactic|galaxy|milky way|stellar|star system|orbit(?:al)?|nebula|astrophysical|n-?body)\b/.test(text);
  const hasMultiverseIntent = /\b(multiverse|observable universe|cosmic web|large[ -]?scale structure|supercluster|galaxy cluster|comoving|redshift|lcdm|cosmology)\b/.test(text);

  let capability: RuntimeCapability = "chat";
  let selectedModel = requested && requestedNormalized !== "ion" && requestedNormalized !== "auto" ? requested : baseModel;
  let fallbackModel = baseModel;
  let reason = requested && requestedNormalized !== "ion" && requestedNormalized !== "auto" ? "explicit-model-request" : "default-primary-model";
  const constraints = ["single-authoritative-runtime", "ts-first-control-loop"];

  if (
    mode === "simulation" ||
    mode === "cosmic" ||
    mode === "multiverse" ||
    input.hasSimulationContext ||
    hasSimulationIntent ||
    hasCosmicIntent ||
    hasMultiverseIntent
  ) {
    capability = "simulation-assist";
    selectedModel = simulationModel;
    fallbackModel = baseModel;
    reason =
      mode === "simulation" || mode === "cosmic" || mode === "multiverse" || input.hasSimulationContext
        ? "simulation-mode-policy"
        : "simulation-intent-policy";
    constraints.push("simulation-aware-response");
    if (hasCosmicIntent || mode === "cosmic") {
      constraints.push("cosmic-aware-response");
    }
    if (hasMultiverseIntent || mode === "multiverse") {
      constraints.push("multiverse-aware-response");
    }
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