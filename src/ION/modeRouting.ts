export type ModeInfo = {
  id: string;
  label: string;
  summary: string;
  aliases: string[];
};

export type ConversationHintsInput = {
  inferredMode?: string;
  latestUserIntent?: string;
  recentUserFocus?: string[];
  recentAssistantCommitments?: string[];
  requestedOutput?: string;
};

export const ION_MODE_INFOS: ModeInfo[] = [
  { id: "auto", label: "Auto", summary: "Automatically routes by task and confidence.", aliases: ["default"] },
  { id: "architect", label: "Architect", summary: "Structured design and systems planning.", aliases: ["design", "routing", "route", "orchestrate"] },
  { id: "analyst", label: "Analyst", summary: "Comparative analysis and trade-off evaluation.", aliases: ["analysis", "evaluate", "assessment"] },
  { id: "visual", label: "Visual", summary: "Image prompt and visual reasoning support.", aliases: ["render", "vision", "image", "visualize"] },
  { id: "lore", label: "Lore", summary: "Narrative continuity and world-building context.", aliases: ["story", "creative", "cinematic", "worldbuilding"] },
  { id: "reasoning", label: "Reasoning", summary: "Step-wise logic and explanation-focused outputs.", aliases: ["logic", "resolve", "unfold", "illuminate"] },
  { id: "coding", label: "Coding", summary: "Implementation, refactor, and debugging assistance.", aliases: ["dev", "programming", "code"] },
  { id: "knowledge", label: "Knowledge", summary: "Reference-driven responses from indexed sources.", aliases: ["retrieval", "reference", "docs"] },
  { id: "system-knowledge", label: "System Knowledge", summary: "Internal module/protocol-aware responses.", aliases: ["system knowledge", "os", "internal"] },
  { id: "anatomy", label: "Anatomy", summary: "Human anatomy and subsystem integration from ION internals.", aliases: ["human", "bio", "physiology"] },
  { id: "simulation", label: "Simulation", summary: "Stateful simulation and controlled scenario exploration.", aliases: ["sim"] },
  { id: "cosmic", label: "Cosmic", summary: "Milky Way-scale deterministic galactic simulation and diagnostics.", aliases: ["galaxy", "cosmic-mode"] },
  { id: "multiverse", label: "Multiverse", summary: "Observable-universe-scale deterministic hierarchical simulation and querying.", aliases: ["multiverse-mode", "universe"] }
];

const CONTINUATION_INTENT_PATTERN = /^(continue|go on|keep going|go deeper|drill down|expand|elaborate|show more|more detail|what next|next step|step \d+|do that|apply that|build that|implement that|advance|keep simulating)\b/i;
const ARCHITECT_INTENT_PATTERN = /\b(architecture|system design|systems design|design a system|design the architecture|implementation plan|execution plan|rollout plan|migration plan|integration plan|blueprint|dependency graph|module graph|interface design|schema design|roadmap)\b/i;
const ANALYST_INTENT_PATTERN = /\b(compare|comparison|trade-?off|tradeoff|analy[sz]e|evaluation|assess(?:ment)?|benchmark|pros and cons|risk analysis|decision matrix|diagnose)\b/i;
const VISUAL_INTENT_PATTERN = /\b(visual(?:ize|ization)?|frame|framing|composition|lighting|palette|storyboard|moodboard|art direction|shot list|rendering style|camera angle|concept art|logo|poster|cover art|design language)\b/i;
const LORE_INTENT_PATTERN = /\b(lore|story|narrative|character arc|worldbuild(?:ing)?|canon|mythos|scene writing|fiction|backstory|dialogue|cinematic)\b/i;
const REASONING_INTENT_PATTERN = /\b(reason(?:ing)?|think through|step by step|prove|derive|work through|deduce|logic puzzle|syllogism|formal logic|resolve)\b/i;
const CODING_INTENT_PATTERN = /\b(code|typescript|javascript|python|tsx|react|node|worker|wrangler|bug|debug|refactor|function|class|compile|syntax|stack trace|test failure|lint error|typecheck)\b/i;
const KNOWLEDGE_INTENT_PATTERN = /\b(according to|reference|sources?|documentation|docs|spec(?:ification)?|manual|guide|research|knowledge base|cite|citations|explain from docs|what do the docs say)\b/i;
const SYSTEM_KNOWLEDGE_INTENT_PATTERN = /\b(ion(?:irix)?|codex|internal modules?|runtime|worker routes?|bindings|durable object|d1|kv|contract|mind os|system knowledge|internal behavior|repo internals?)\b/i;
const ANATOMY_INTENT_PATTERN = /\b(anatomy|anatomical|physiology|human\s+body|cranial\s+nerve|skeletal|muscle|organ|head\s+api|spine|torso|neck|limb|vascular|nerves?)\b/i;
const SIMULATION_INTENT_PATTERN = /\b(simulate|simulation mode|scenario|stress[ -]?test|forecast|project forward|play out|run through|step through|model(?: this| the| a)?|counterfactual|what if)\b/i;
const COSMIC_SCOPE_PATTERN = /\b(cosmic|galactic|galaxy|milky way|stellar|star system|orbit(?:al)?|nebula|astrophysical|n-?body)\b/i;
const MULTIVERSE_SCOPE_PATTERN = /\b(multiverse|observable universe|cosmic web|large[ -]?scale structure|supercluster|galaxy cluster|comoving|redshift|lcdm|cosmology)\b/i;

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function summarizeText(value: unknown, maxLen = 220): string {
  const text = normalizeText(value);
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 3))}...`;
}

function buildModeAliasMap() {
  const map = new Map<string, string>();

  for (const mode of ION_MODE_INFOS) {
    map.set(mode.id, mode.id);
    for (const alias of mode.aliases) {
      map.set(alias, mode.id);
    }
  }

  map.set("analysis", "analyst");
  map.set("vision", "visual");
  map.set("cinematic", "lore");
  map.set("creative", "lore");
  map.set("os", "system-knowledge");

  return map;
}

const MODE_ALIAS_MAP = buildModeAliasMap();

export function canonicalizeIONMode(value: string): string {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return "auto";
  return MODE_ALIAS_MAP.get(normalized) || normalized;
}

function extractExplicitModeReference(value: string): string | null {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return null;

  const modeCallPattern = /(?:^|\b)(?:\/mode|use|switch to|activate|enter|set)(?:\s+the)?\s+([a-z-]+)(?:\s+mode)?\b/i;
  const match = normalized.match(modeCallPattern);
  if (match?.[1]) {
    return canonicalizeIONMode(match[1]);
  }

  for (const [alias, modeId] of MODE_ALIAS_MAP.entries()) {
    if (alias === "auto") continue;
    const aliasPattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s+mode\\b`, "i");
    if (aliasPattern.test(normalized)) {
      return modeId;
    }
  }

  return null;
}

export function normalizeConversationHints(raw?: ConversationHintsInput | null) {
  return {
    inferredMode: normalizeText(raw?.inferredMode).toLowerCase(),
    latestUserIntent: summarizeText(raw?.latestUserIntent, 220),
    requestedOutput: summarizeText(raw?.requestedOutput || "general", 64).toLowerCase(),
    recentUserFocus: Array.isArray(raw?.recentUserFocus)
      ? raw.recentUserFocus.map((item) => summarizeText(item, 180)).filter(Boolean).slice(0, 4)
      : [],
    recentAssistantCommitments: Array.isArray(raw?.recentAssistantCommitments)
      ? raw.recentAssistantCommitments.map((item) => summarizeText(item, 180)).filter(Boolean).slice(0, 4)
      : []
  };
}

export function inferIONModeFromPrompt(text: string): string | null {
  const normalized = normalizeText(text).toLowerCase();
  if (!normalized) return null;

  const explicitMode = extractExplicitModeReference(normalized);
  if (explicitMode && explicitMode !== "auto") {
    return explicitMode;
  }

  const hasSimulationIntent = /^\/simulation\b/.test(normalized) || SIMULATION_INTENT_PATTERN.test(normalized);
  const hasCosmicScope = COSMIC_SCOPE_PATTERN.test(normalized);
  const hasMultiverseScope = MULTIVERSE_SCOPE_PATTERN.test(normalized);

  if (hasMultiverseScope && (hasSimulationIntent || /\b(query|map|render|explore|diagnostics?)\b/i.test(normalized))) {
    return "multiverse";
  }

  if (hasCosmicScope && (hasSimulationIntent || /\b(diagnostics?|evolve|orbit|trajectory|mode)\b/i.test(normalized))) {
    return "cosmic";
  }

  if (ARCHITECT_INTENT_PATTERN.test(normalized)) return "architect";
  if (ANALYST_INTENT_PATTERN.test(normalized)) return "analyst";
  if (ANATOMY_INTENT_PATTERN.test(normalized)) return "anatomy";
  if (SYSTEM_KNOWLEDGE_INTENT_PATTERN.test(normalized) && /\b(internal|module|runtime|worker|route|binding|contract|codex|protocol|repo|system)\b/i.test(normalized)) {
    return "system-knowledge";
  }
  if (CODING_INTENT_PATTERN.test(normalized)) return "coding";
  if (VISUAL_INTENT_PATTERN.test(normalized)) return "visual";
  if (LORE_INTENT_PATTERN.test(normalized)) return "lore";
  if (REASONING_INTENT_PATTERN.test(normalized)) return "reasoning";
  if (KNOWLEDGE_INTENT_PATTERN.test(normalized)) return "knowledge";
  if (hasSimulationIntent) return "simulation";

  return null;
}

function shouldContinuePreviousMode(text: string, previousMode: string): boolean {
  const normalized = normalizeText(text).toLowerCase();
  const remembered = canonicalizeIONMode(previousMode);
  if (!normalized || !remembered || remembered === "auto") return false;

  if (!CONTINUATION_INTENT_PATTERN.test(normalized)) {
    return false;
  }

  return true;
}

export function resolveEffectiveIONMode(input: {
  requestedMode: string;
  latestUserText: string;
  conversationHints: ReturnType<typeof normalizeConversationHints>;
  lastMode?: string;
}): string {
  const requestedMode = canonicalizeIONMode(input.requestedMode);
  if (requestedMode !== "auto") {
    return requestedMode;
  }

  const explicitHintMode =
    extractExplicitModeReference(input.conversationHints.inferredMode) ||
    extractExplicitModeReference(input.conversationHints.requestedOutput);

  if (explicitHintMode && explicitHintMode !== "auto") {
    return explicitHintMode;
  }

  const inferredMode = inferIONModeFromPrompt(
    [
      input.latestUserText,
      input.conversationHints.latestUserIntent,
      ...input.conversationHints.recentUserFocus,
      ...input.conversationHints.recentAssistantCommitments
    ]
      .filter(Boolean)
      .join("\n")
  );

  if (inferredMode) {
    return inferredMode;
  }

  const rememberedMode = canonicalizeIONMode(input.lastMode || "");
  if (shouldContinuePreviousMode(input.latestUserText, rememberedMode)) {
    return rememberedMode;
  }

  return requestedMode;
}