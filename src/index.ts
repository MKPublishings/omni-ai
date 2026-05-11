import { IONLogger } from "./logging/logger";
import { initializeCosmicMode } from "./modes/cosmic/cosmic_mode";
import { initializeMultiverseMode } from "./modes/multiverse/multiverse_mode";
import { IONSafety } from "./stability/safety";
import { IONBrainLoop } from "./runtime/loop";
import { ping as apiPing } from "./api/ping";
import { listModes, listModeDetails, getModeDetails } from "./api/modes";
import { getMemory as getMemoryApi, setMemory as setMemoryApi, deleteMemory as deleteMemoryApi } from "./api/memory";
import {
  buildModeTemplate,
  chooseModelForTask,
  getPreferences,
  resetPreferences,
  savePreferences,
  searchKnowledge,
  searchModules,
  shouldUseKnowledgeRetrieval,
  shouldUseSystemKnowledge
} from "./ION/enhancements";
import { listAvailableStyles, resolveStyleName } from "./ION/rendering/styles/styleRegistry";
import { type LawReference } from "./ION/laws/imageLawBridge";
import { Laws, type LawDomain } from "./ION/laws/lawRegistry";
import { warmupConnections, getConnectionStats } from "./llm/cloudflareOptimizations";
import { advanceSimulationState, exportSimulationState } from "./ION/simulation/engine";
import {
  clearChatHistoryForUser,
  ensureIONMemorySchema,
  getChatHistoryForUser,
  getChatPreferences,
  getRecentMemoryArc,
  getRecentMemoryArcForUser,
  saveMemoryTurn,
  updateChatPreferences
} from "./memory/d1Memory";
import { formatWorkingMemoryPrompt, loadWorkingMemory, updateWorkingMemoryFromTurn } from "./memory/workingMemory";
import { runSelfMaintenance } from "./maintenance/selfMaintenance";
import { getMaintenanceStatus } from "./maintenance/status";
import { decideMultimodalRoute } from "./ION/multimodal/router";
import { runVisualReasoning } from "./ION/multimodal/visualReasoner";
import { buildPersonaPrompt, resolvePersonaProfile } from "./ION/behavior/personaEngine";
import { buildEmotionalResonancePrompt, getEmotionalResonance, persistEmotionalResonance } from "./ION/behavior/emotionalResonance";
import { applyAdaptiveBehavior, buildAdaptiveBehaviorPrompt } from "./ION/behavior/adaptiveBehavior";
import { canonicalizeIONMode, normalizeConversationHints, resolveEffectiveIONMode } from "./ION/modeRouting";
import { getSessionByToken, touchSession } from "./auth/credentials";
import { executeTool } from "./tools/execute";
import { generateTaskShards } from "./tools/auto_tokenizer/taskShardGenerator";
import { bootstrapSafeTensorGovernance } from "./image-gen/safe-tensor-bootstrap";
import { executeIonImagePipeline } from "./image-gen/app/ion-image-pipeline";
import {
  buildIonEnhancedSdxlPrompt,
  optimizeSdxlParameters,
  buildSdxlEnhancementMetadata,
  type SdxlEnhancementMetadata,
} from "./image-gen/integration/sdxl-ion-enhancer";
import { bytesToBase64, isReadableByteStream, normalizeGeneratedImageOutput } from "./shared/image-output";
import {
  ION_IMAGE_DEFAULT_HEIGHT,
  ION_IMAGE_DEFAULT_QUALITY,
  ION_IMAGE_DEFAULT_RATIO,
  ION_IMAGE_DEFAULT_RESOLUTION,
  ION_IMAGE_DEFAULT_WIDTH,
  ION_IMAGE_PROMPT_MAX_CHARS,
  inferCameraFromPrompt as inferLegacyCameraFromPrompt,
  inferLightingFromPrompt as inferLegacyLightingFromPrompt,
  inferMaterialsFromPrompt as inferLegacyMaterialsFromPrompt,
  inferStyleFromPrompt as inferLegacyStyleFromPrompt,
  normalizeImageGenerationError as normalizeLegacyImageGenerationError,
} from "./image-gen/app/ion-image-legacy-generation-service";
import { buildIonImageV2RouteResponse } from "./image-gen/app/ion-image-route-format";
import { getIonImageQueueStatusRouteResult, submitIonImageQueueRouteResult } from "./image-gen/app/ion-image-queue-route-service";
import { buildIonImageV2RouteResult } from "./image-gen/app/ion-image-v2-route-service";
import type { AgentProfile, Department, Priority } from "./mind/contracts/taskShardContracts";
import blackwellAgentProfilesConfig from "../config/blackwell-agent-profiles.json";
export { IONSession } from "./memory/session";

export interface Env {
  AI: any;
  MEMORY: KVNamespace;
  MIND: KVNamespace;
  ASSETS: Fetcher;
  ION_DB?: D1Database;
  ION_SESSION?: DurableObjectNamespace;
  MODEL_ION?: string;
  MODEL_IMAGE?: string;
  MODEL_IMAGE_POLICY_FALLBACK?: string;
  ION_RESPONSE_MIN_CHARS?: string;
  ION_RESPONSE_BASE_CHARS?: string;
  ION_RESPONSE_MAX_CHARS?: string;
  ION_MIN_OUTPUT_TOKENS?: string;
  ION_MAX_OUTPUT_TOKENS?: string;
  ION_ENV?: string;
  ION_MEMORY_RETENTION_DAYS?: string;
  ION_SESSION_MAX_AGE_HOURS?: string;
  ION_AUTONOMY_LEVEL?: string;
  ION_ADMIN_KEY?: string;
  ION_MEDIA_API_BASE_URL?: string;
  ION_MEDIA_BASE_URL?: string;
  ION_MEDIA_HOST?: string;
  ION_MEDIA_PORT?: string;
  ION_MEDIA_API_KEY?: string;
  ION_MEDIA_API_TIMEOUT_MS?: string;
  ION_FAST_CHAT?: string;
  ION_NATIVE_STREAMING?: string;
  ION_IMAGE_PIPELINE_V2?: string;
  ION_IMAGE_QUEUE_V1?: string;
  ION_IMAGE_DIRECT_FALLBACK_ON_PROMPT_403?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
}

function hasRuntimeSecret(value: unknown): boolean {
  return String(value || "").trim().length > 0;
}

function getProviderStatusSnapshot(env: Env): Record<string, unknown> {
  void env;

  return {
    ok: true,
    generatedAt: Date.now(),
    providers: {
      text: {
        active: "ION",
        ION_live: true,
        fallback_active: false,
        models: ["ION"]
      },
      image: {
        active: "ION",
        ION_live: true,
        fallback_active: false,
        model_hint: "ION-image"
      },
      audio: {
        ION_live: true
      }
    },
    runtime: {
      ION_runtime: true
    }
  };
}

type IONRole = "system" | "user" | "assistant";

type IONMessage = {
  role: IONRole;
  content: string;
};

type IONRequestBody = {
  mode?: string;
  model?: string;
  fastMode?: boolean;
  messages?: Array<{ role?: string; content?: string }>;
  conversationHints?: {
    inferredMode?: string;
    latestUserIntent?: string;
    recentUserFocus?: string[];
    recentAssistantCommitments?: string[];
    requestedOutput?: string;
  };
  safetyProfile?: {
    ageTier?: string;
    humanVerified?: boolean;
    adultAccess?: boolean;
    explicitAllowed?: boolean;
    illegalBlocked?: boolean;
    legalAttestation?: {
      accepted?: boolean;
      jurisdiction?: string;
      truthfulIdentity?: boolean;
      lawfulUse?: boolean;
      userDirected?: boolean;
      acceptedAt?: number;
    };
  };
};

type HumanVerifyRequestBody = {
  token?: string;
  challengeId?: string;
  challengeAnswer?: string;
  birthDate?: {
    year?: number;
    month?: number;
    day?: number;
  };
};

type ImageRequestBody = {
  prompt?: string;
  userId?: string;
  feedback?: string;
  stylePack?: string;
  laws?: LawReference[];
  quality?: string;
  mode?: string;
  seed?: number;
  debug?: boolean;
  ratio?: string;
  resolution?: string;
  width?: number;
  height?: number;
  camera?: string;
  lighting?: string;
  materials?: string[];
  safetyProfile?: {
    ageTier?: string;
    humanVerified?: boolean;
    adultAccess?: boolean;
    explicitAllowed?: boolean;
    illegalBlocked?: boolean;
    legalAttestation?: {
      accepted?: boolean;
      jurisdiction?: string;
      truthfulIdentity?: boolean;
      lawfulUse?: boolean;
      userDirected?: boolean;
      acceptedAt?: number;
    };
  };
};

type SafetyProfile = {
  ageTier: "adult" | "minor";
  humanVerified: boolean;
  adultAccess: boolean;
  explicitAllowed: boolean;
  illegalBlocked: boolean;
  legalAttestation: {
    accepted: boolean;
    jurisdiction: string;
    truthfulIdentity: boolean;
    lawfulUse: boolean;
    userDirected: boolean;
    acceptedAt: number;
  };
};

function isComfyPromptAccessDeniedError(error: unknown): boolean {
  const message = String((error as { message?: string } | null)?.message || "").toLowerCase();
  const name = String((error as { name?: string } | null)?.name || "").toUpperCase();
  if (name === "E_COMFYUI_DOWN" && message.includes("(403)") && message.includes("/prompt")) {
    return true;
  }
  return message.includes("(403)") && message.includes("/prompt");
}

const DIRECT_FALLBACK_DEFAULT_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
const DIRECT_FALLBACK_DEFAULT_CFG = 7;
const DIRECT_FALLBACK_DEFAULT_STEPS = 28;
const DIRECT_FALLBACK_MAX_EDGE = 1536;
const DIRECT_FALLBACK_FLUX_MAX_EDGE = 1024;
const DIRECT_FALLBACK_FLUX_MAX_STEPS = 20;
const DIRECT_FALLBACK_DEFAULT_MAX_STEPS = 20;

function isAnimeLikePrompt(prompt: string): boolean {
  const normalized = sanitizePromptText(String(prompt || "")).toLowerCase();
  if (!normalized) {
    return false;
  }

  return /\b(anime|manga|waifu|niji|chibi|cel\s*shad|lineart|otaku|kawaii|studio\s*ghibli)\b/i.test(normalized);
}

function clampDimensionsToMaxEdge(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const safeWidth = Math.max(256, Math.floor(Number(width) || 0));
  const safeHeight = Math.max(256, Math.floor(Number(height) || 0));

  const largestEdge = Math.max(safeWidth, safeHeight);
  if (largestEdge <= maxEdge) {
    return { width: safeWidth, height: safeHeight };
  }

  const ratio = maxEdge / largestEdge;
  const clampedWidth = Math.max(256, Math.round(safeWidth * ratio));
  const clampedHeight = Math.max(256, Math.round(safeHeight * ratio));
  return { width: clampedWidth, height: clampedHeight };
}

function buildDirectFallbackPrompt(promptText: string, animeLike: boolean): string {
  const base = sanitizePromptText(promptText);
  if (!base) {
    return "high quality illustration, clear subject, coherent composition";
  }

  const qualitySuffix = animeLike
    ? "anime illustration, clean line art, coherent subject anatomy, expressive face, cel-shaded color separation, clear foreground subject"
    : "high quality composition, coherent subject, detailed textures, clear lighting";

  return `${base}, ${qualitySuffix}`;
}

function buildDirectFallbackNegativePrompt(animeLike: boolean): string {
  const baseline = "noise, grain, static, abstract texture, blurry, deformed anatomy, extra limbs, warped face, low contrast, washed out";
  if (!animeLike) {
    return baseline;
  }

  return `${baseline}, realistic skin pores, photoreal artifacts, monochrome haze`;
}

/**
 * Build ION-enhanced SDXL prompt for better quality fallback
 * Uses ION's sophisticated prompt assembly when available
 */
function buildIonEnhancedDirectFallbackPrompt(
  promptText: string,
  animeLike: boolean,
  styleFamily?: string
): { positive: string; negative: string } {
  try {
    const enhanced = buildIonEnhancedSdxlPrompt(promptText, {
      animeLike,
      styleFamily: (styleFamily as any) || undefined,
      checkpointId: DIRECT_FALLBACK_DEFAULT_MODEL,
    });

    return {
      positive: enhanced.positive,
      negative: enhanced.negative,
    };
  } catch {
    // Fallback to basic prompt if ION enhancement fails
    return {
      positive: buildDirectFallbackPrompt(promptText, animeLike),
      negative: buildDirectFallbackNegativePrompt(animeLike),
    };
  }
}

function resolveDirectFallbackConfig(env: Env, promptText: string) {
  const configuredModel = sanitizePromptText(String(env.MODEL_IMAGE || ""));
  const policyFallbackModel = sanitizePromptText(String(env.MODEL_IMAGE_POLICY_FALLBACK || ""));
  const animeLike = isAnimeLikePrompt(promptText);

  let modelName = configuredModel || DIRECT_FALLBACK_DEFAULT_MODEL;
  if (animeLike && policyFallbackModel) {
    modelName = policyFallbackModel;
  } else if (animeLike && /flux-1-schnell/i.test(modelName)) {
    modelName = DIRECT_FALLBACK_DEFAULT_MODEL;
  }

  const isFluxModel = /flux-1-schnell/i.test(modelName);
  
  // Use ION parameter optimization for SDXL models
  let guidance = DIRECT_FALLBACK_DEFAULT_CFG;
  let steps = DIRECT_FALLBACK_DEFAULT_STEPS;
  let maxEdge = DIRECT_FALLBACK_MAX_EDGE;

  if (!isFluxModel) {
    // Apply ION optimization for SDXL
    try {
      const optimized = optimizeSdxlParameters(undefined, animeLike, DIRECT_FALLBACK_DEFAULT_CFG, DIRECT_FALLBACK_DEFAULT_STEPS);
      guidance = optimized.guidance;
      steps = optimized.steps;
    } catch {
      // Fallback to defaults if optimization fails
      const targetSteps = animeLike ? 32 : DIRECT_FALLBACK_DEFAULT_STEPS;
      steps = Math.max(1, Math.min(targetSteps, DIRECT_FALLBACK_DEFAULT_MAX_STEPS));
      guidance = animeLike ? 8 : DIRECT_FALLBACK_DEFAULT_CFG;
    }
  } else {
    // Flux model configuration
    const targetSteps = animeLike ? 32 : DIRECT_FALLBACK_DEFAULT_STEPS;
    const maxSteps = isFluxModel ? DIRECT_FALLBACK_FLUX_MAX_STEPS : DIRECT_FALLBACK_DEFAULT_MAX_STEPS;
    steps = Math.max(1, Math.min(targetSteps, maxSteps));
    guidance = animeLike ? 8 : DIRECT_FALLBACK_DEFAULT_CFG;
    maxEdge = isFluxModel ? DIRECT_FALLBACK_FLUX_MAX_EDGE : DIRECT_FALLBACK_MAX_EDGE;
  }

  return {
    animeLike,
    modelName,
    guidance,
    steps,
    maxEdge,
  };
}

function isNumStepsLimitError(error: unknown): boolean {
  const message = String((error as { message?: string } | null)?.message || "").toLowerCase();
  return message.includes("num_steps") && (message.includes("must be <=") || message.includes("must be <=\u202f"));
}

function makeDirectFallbackFilename(styleId: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeStyle = String(styleId || "image").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `ionirix_${safeStyle}_${timestamp}.png`;
}

async function buildDirectAiImageFallbackResponse(input: {
  env: Env;
  userId: string;
  promptText: string;
  requestedMode: string;
  effectiveQuality: string;
  effectiveRatio: string;
  effectiveWidth: number;
  effectiveHeight: number;
  parsedSeed: number;
  resolvedRenderingStyle: string;
  effectiveStylePack: string;
  feedback: string;
  effectiveCamera: string;
  effectiveLighting: string;
  effectiveMaterials: string[];
  promptInferredCamera: string;
  promptInferredLighting: string;
  promptInferredMaterials: string[];
  requestedCameraRaw: string;
  requestedLightingRaw: string;
  requestedMaterials: string[];
  safetyProfile: SafetyProfile;
}): Promise<Response> {
  const fallbackConfig = resolveDirectFallbackConfig(input.env, input.promptText);
  
  // Use ION-enhanced prompt for better quality SDXL generation
  const ionPrompts = buildIonEnhancedDirectFallbackPrompt(
    input.promptText,
    fallbackConfig.animeLike,
    input.effectiveStylePack
  );
  const prompt = ionPrompts.positive;
  const negativePrompt = ionPrompts.negative;
  
  const directDimensions = clampDimensionsToMaxEdge(
    input.effectiveWidth,
    input.effectiveHeight,
    fallbackConfig.maxEdge,
  );
  const startedAt = Date.now();
  let effectiveSteps = fallbackConfig.steps;
  let raw: unknown;
  try {
    raw = await input.env.AI.run(fallbackConfig.modelName, {
      prompt,
      negative_prompt: negativePrompt,
      width: directDimensions.width,
      height: directDimensions.height,
      seed: Number.isFinite(input.parsedSeed) ? input.parsedSeed : undefined,
      guidance: fallbackConfig.guidance,
      num_steps: effectiveSteps,
    });
  } catch (initialError: unknown) {
    if (!isNumStepsLimitError(initialError) || fallbackConfig.steps === DIRECT_FALLBACK_FLUX_MAX_STEPS) {
      throw initialError;
    }

    effectiveSteps = DIRECT_FALLBACK_FLUX_MAX_STEPS;
    raw = await input.env.AI.run(fallbackConfig.modelName, {
      prompt,
      negative_prompt: negativePrompt,
      width: directDimensions.width,
      height: directDimensions.height,
      seed: Number.isFinite(input.parsedSeed) ? input.parsedSeed : undefined,
      guidance: fallbackConfig.guidance,
      num_steps: effectiveSteps,
    });
  }
  const normalized = await normalizeGeneratedImageOutput(raw);
  const imageDataUrl = `data:${normalized.mimeType};base64,${bytesToBase64(normalized.bytes)}`;
  const filename = makeDirectFallbackFilename(input.resolvedRenderingStyle);
  const styleSource = input.effectiveStylePack ? "session-or-request" : "auto";
  const cameraSource = input.promptInferredCamera ? "prompt" : (input.requestedCameraRaw ? "session-or-request" : "none");
  const lightingSource = input.promptInferredLighting ? "prompt" : (input.requestedLightingRaw ? "session-or-request" : "none");
  const materialsSource = input.promptInferredMaterials.length ? "prompt" : (input.requestedMaterials.length ? "session-or-request" : "none");

  const payload = {
    user_id: input.userId,
    imageDataUrl,
    filename,
    metadata: {
      pipeline: {
        version: "v2",
        gateway: "ai-direct-fallback",
        requestId: `fallback-${crypto.randomUUID()}`,
        promptId: "direct-ai",
        reasoningChain: ["comfyui-forbidden-fallback"],
        totalMs: Date.now() - startedAt,
      },
      request: {
        mode: input.requestedMode,
        quality: input.effectiveQuality,
        originalPrompt: input.promptText,
        styleFamily: input.resolvedRenderingStyle,
        styleSource,
        inferredMood: fallbackConfig.animeLike ? "stylized" : "unknown",
        confidence: 0,
        feedbackApplied: Boolean(input.feedback),
      },
      image: {
        filename,
        mimeType: normalized.mimeType,
        width: directDimensions.width,
        height: directDimensions.height,
        ratio: input.effectiveRatio,
        resolution: `${directDimensions.width}x${directDimensions.height}`,
        format: normalized.mimeType.includes("jpeg") ? "jpeg" : normalized.mimeType.includes("webp") ? "webp" : "png",
        exportLocation: "chat-download",
      },
      model: {
        checkpoint: fallbackConfig.modelName,
        outputModel: fallbackConfig.modelName,
        predictionType: "direct",
        vae: "n/a",
        clipSkip: 0,
        sampler: "auto",
        scheduler: "auto",
        steps: effectiveSteps,
        cfgScale: fallbackConfig.guidance,
        cfgRescale: 0,
        seed: Number.isFinite(input.parsedSeed) ? input.parsedSeed : null,
        batchSize: 1,
      },
      prompt: {
        positive: prompt,
        negative: negativePrompt,
        qualityTags: [],
        styleTags: [],
      },
      scene: {
        camera: {
          value: input.effectiveCamera,
          source: cameraSource,
        },
        lighting: {
          value: input.effectiveLighting,
          source: lightingSource,
        },
        materials: {
          values: input.effectiveMaterials,
          source: materialsSource,
        },
      },
      safety: {
        ageTier: input.safetyProfile.ageTier,
        explicitAllowed: input.safetyProfile.explicitAllowed,
        illegalBlocked: input.safetyProfile.illegalBlocked,
      },
    },
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "X-ION-Image-Model": fallbackConfig.modelName,
      "X-ION-Image-Route": "image-gen-v2",
      "Access-Control-Expose-Headers": "X-ION-Image-Model",
    },
  });
}

type InternetSearchHit = {
  title: string;
  snippet: string;
  url: string;
  source: "duckduckgo" | "wikipedia" | "espn" | "yahoo-finance";
};

type InternetWeatherResult = {
  location: string;
  latitude: number;
  longitude: number;
  temperatureC: number;
  windSpeedKmh: number;
  weatherCode: number;
  observationTime: string;
  timezone: string;
  dailySummary?: {
    date: string;
    temperatureMaxC: number;
    temperatureMinC: number;
    precipitationProbabilityMax?: number | null;
  } | null;
};

type InternetInspectResult = {
  url: string;
  title: string;
  excerpt: string;
  contentPreview: string;
};

type InternetLearningFact = {
  title: string;
  snippet: string;
  url: string;
  source: "duckduckgo" | "wikipedia" | "espn" | "yahoo-finance";
};

type ChatSourceReference = {
  title: string;
  url: string;
  source: string;
};

type InternetLearningEntry = {
  id: string;
  ts: number;
  mode: string;
  query: string;
  facts: InternetLearningFact[];
};

type InternetLearningStore = {
  updatedAt: number;
  entries: InternetLearningEntry[];
};

const INTERNET_LEARNING_KEY = "ION_internet_learning_v1";
const INTERNET_LEARNING_MAX_ENTRIES = 120;

type InternetSearchProfile = {
  queryPrefix: string;
  querySuffix: string;
  limit: number;
};

function dedupeChatSources(sources: ChatSourceReference[], limit = 4): ChatSourceReference[] {
  const out: ChatSourceReference[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    const title = sanitizePromptText(String(source?.title || "")).trim();
    const url = sanitizePromptText(String(source?.url || "")).trim();
    const label = sanitizePromptText(String(source?.source || "source")).trim().toLowerCase() || "source";
    if (!title || !url) continue;

    const key = `${title.toLowerCase()}|${url.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({ title, url, source: label });
    if (out.length >= Math.max(1, limit)) break;
  }

  return out;
}

function buildInternetSourceReferences(hits: InternetSearchHit[], limit = 4): ChatSourceReference[] {
  return dedupeChatSources(
    hits.map((hit) => ({
      title: sanitizePromptText(String(hit.title || "")).trim(),
      url: sanitizePromptText(String(hit.url || "")).trim(),
      source: sanitizePromptText(String(hit.source || "source")).trim().toLowerCase()
    })),
    limit
  );
}

function buildWeatherSourceReference(weather: InternetWeatherResult | null): ChatSourceReference[] {
  if (!weather) return [];

  const title = weather.location
    ? `Open-Meteo weather for ${weather.location}`
    : "Open-Meteo weather";
  const url = `https://open-meteo.com/en/docs`;

  return [{
    title,
    url,
    source: "open-meteo"
  }];
}

function toPositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeAdaptiveResponseMax(messages: IONMessage[], env: Env): number {
  const configuredMin = toPositiveInt(env.ION_RESPONSE_MIN_CHARS, 2000);
  const configuredBase = toPositiveInt(env.ION_RESPONSE_BASE_CHARS, 4500);
  const configuredMax = toPositiveInt(env.ION_RESPONSE_MAX_CHARS, 50000);

  const floor = Math.max(500, configuredMin);
  const ceiling = Math.max(floor, configuredMax);
  const base = clamp(configuredBase, floor, ceiling);

  const userMessages = (messages || []).filter((m) => m?.role === "user");
  const latestUserText = String(userMessages[userMessages.length - 1]?.content || "");
  const latestUserChars = latestUserText.trim().length;

  const totalUserChars = userMessages.reduce((sum, m) => {
    return sum + String(m?.content || "").trim().length;
  }, 0);

  const userTurns = userMessages.length;
  const asksForDepth =
    /\b(detailed|detail|thorough|comprehensive|deep(?:\s+dive)?|step[-\s]?by[-\s]?step|full(?:\s+version)?|long(?:er)?|explain)\b/i.test(
      latestUserText
    );

  const effortScore =
    latestUserChars + Math.floor(totalUserChars * 0.35) + userTurns * 140 + (asksForDepth ? 900 : 0);

  const adaptive = base + Math.floor(effortScore * 3.2);
  return clamp(adaptive, floor, ceiling);
}

function computeAdaptiveOutputTokens(responseCharLimit: number, env: Env): number {
  const configuredMinTokens = toPositiveInt(env.ION_MIN_OUTPUT_TOKENS, 512);
  const configuredMaxTokens = toPositiveInt(env.ION_MAX_OUTPUT_TOKENS, 8192);

  const minTokens = Math.max(128, configuredMinTokens);
  const maxTokens = Math.max(minTokens, configuredMaxTokens);

  const charsPerToken = 4;
  const targetTokens = Math.ceil(responseCharLimit / charsPerToken);
  return clamp(targetTokens, minTokens, maxTokens);
}

function isNonProduction(request: Request, env: Env): boolean {
  const explicitEnv = String(env.ION_ENV || "").trim().toLowerCase();
  if (explicitEnv) {
    return explicitEnv !== "production";
  }

  const host = new URL(request.url).hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".workers.dev");
}

function isEnabledFlag(value: unknown): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS"
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function computeAgeFromBirthDate(year: number, month: number, day: number, now = new Date()): number {
  const dob = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(dob.getTime()) ||
    dob.getUTCFullYear() !== year ||
    dob.getUTCMonth() !== month - 1 ||
    dob.getUTCDate() !== day
  ) {
    return -1;
  }

  const nowUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (dob.getTime() > nowUtc.getTime()) return -1;

  let age = nowUtc.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = nowUtc.getUTCMonth() - dob.getUTCMonth();
  const dayDiff = nowUtc.getUTCDate() - dob.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}

function getRequestIp(request: Request): string {
  return String(request.headers.get("cf-connecting-ip") || "").trim();
}

async function verifyTurnstileToken(request: Request, env: Env, token: string): Promise<boolean> {
  const secret = String(env.TURNSTILE_SECRET_KEY || "").trim();
  if (!secret) {
    return isNonProduction(request, env);
  }

  const payload = new URLSearchParams();
  payload.set("secret", secret);
  payload.set("response", token);
  const remoteIp = getRequestIp(request);
  if (remoteIp) {
    payload.set("remoteip", remoteIp);
  }

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: payload.toString()
    });

    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean };
    return result?.success === true;
  } catch {
    return false;
  }
}

type HumanChallengeRecord = {
  answer: string;
  createdAt: number;
};

function makeHumanChallengePrompt(): { prompt: string; answer: string } {
  const a = Math.floor(Math.random() * 16) + 5;
  const b = Math.floor(Math.random() * 16) + 3;
  const useAddition = Math.random() >= 0.35;

  if (useAddition) {
    return {
      prompt: `What is ${a} + ${b}?`,
      answer: String(a + b)
    };
  }

  const high = Math.max(a, b);
  const low = Math.min(a, b);
  return {
    prompt: `What is ${high} - ${low}?`,
    answer: String(high - low)
  };
}

async function createHumanChallenge(env: Env): Promise<{ challengeId: string; prompt: string; expiresInSec: number }> {
  const challengeId = crypto.randomUUID();
  const challenge = makeHumanChallengePrompt();
  const record: HumanChallengeRecord = {
    answer: challenge.answer,
    createdAt: Date.now()
  };

  if (env.MEMORY) {
    await env.MEMORY.put(`human_challenge:${challengeId}`, JSON.stringify(record), {
      expirationTtl: 5 * 60
    });
  }

  return {
    challengeId,
    prompt: challenge.prompt,
    expiresInSec: 5 * 60
  };
}

async function verifyFallbackChallenge(env: Env, challengeId: string, answer: string): Promise<boolean> {
  if (!env.MEMORY) return false;
  const key = `human_challenge:${challengeId}`;
  const raw = await env.MEMORY.get(key);
  if (!raw) return false;

  await env.MEMORY.delete(key);

  try {
    const parsed = JSON.parse(raw) as HumanChallengeRecord;
    const expected = String(parsed?.answer || "").trim();
    const provided = String(answer || "").trim();
    if (!expected || !provided) return false;
    return expected === provided;
  } catch {
    return false;
  }
}

function getLatestUserText(messages: IONMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      return String(messages[i]?.content || "");
    }
  }

  return "";
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeFixed(value: unknown, digits: number, fallback = "0.000"): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : fallback;
}

function safeExponential(value: unknown, digits: number, fallback = "0.000e+0"): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toExponential(digits) : fallback;
}

function buildCosmicSimulationContext(messages: IONMessage[]): {
  systemPrompt: string;
  logsSummary: string;
  statusSummary: string;
  chatSummary: string;
  exportPayload: {
    fileName: string;
  };
  state: {
    simulationId: string;
    status: string;
    stepsExecuted: number;
    targetSteps: number;
    completionPercentage: number;
    resultSummary: string;
  };
} {
  try {
    const latestUserText = getLatestUserText(messages);
    const stepBudget = Math.max(1, Math.min(5, Math.ceil(String(latestUserText || "").length / 120)));
    const adapter = initializeCosmicMode({
      seed: 42,
      timestep: 1.0,
      total_duration: Math.max(10, stepBudget + 1),
      output_interval: 5.0
    });

    for (let i = 0; i < stepBudget; i++) {
      adapter.stepOnce();
    }

    const state = adapter.getState();
    const d = state?.diagnostics || ({} as any);

    const currentTime = safeNumber(state?.current_time, 0);
    const stepCount = Math.max(0, Math.floor(safeNumber(state?.step_count, 0)));
    const formationEvents = Array.isArray(state?.formation_events) ? state.formation_events.length : 0;
    const deathEvents = Array.isArray(state?.death_events) ? state.death_events.length : 0;
    const completionPercentage = Math.round((stepCount / stepBudget) * 100);
    const simulationId = `cosmic-${Date.now()}`;
    const resultSummary = `Cosmic simulation reached step ${stepCount}/${stepBudget} with virial ratio ${safeFixed(d.virial_ratio, 3)}.`;

    const systemPrompt = [
      "Cosmic Simulation Mode active.",
      "Treat this as deterministic Milky Way-scale simulation context.",
      `Current t=${safeFixed(currentTime, 1, "0.0")} Myr, step=${stepCount}.`,
      `Mass summary (M_sun): total=${safeExponential(d.total_mass, 3)}, stellar=${safeExponential(d.total_stellar_mass, 3)}, gas=${safeExponential(d.total_gas_mass, 3)}.`
    ].join("\n");

    const logsSummary = [
      `Cosmic engine advanced ${stepCount} step(s).`,
      `Virial ratio=${safeFixed(d.virial_ratio, 3)}.`,
      `Formation events=${formationEvents}, death events=${deathEvents}.`
    ].join("\n");

    const statusSummary = [
      `Simulation ID: ${simulationId}`,
      "Status: completed",
      `Progress: ${completionPercentage}% (${stepCount}/${stepBudget} steps)`,
      `Summary: ${resultSummary}`
    ].join("\n");

    const chatSummary = [
      `Cosmic simulation completed ${completionPercentage}% of the current request budget.`,
      resultSummary,
      "Export is available as a JSON snapshot for chat or download."
    ].join("\n");

    return {
      systemPrompt,
      logsSummary,
      statusSummary,
      chatSummary,
      exportPayload: {
        fileName: `${simulationId}.json`
      },
      state: {
        simulationId,
        status: "completed",
        stepsExecuted: stepCount,
        targetSteps: stepBudget,
        completionPercentage,
        resultSummary
      }
    };
  } catch (error) {
    const simulationId = `cosmic-${Date.now()}`;
    const resultSummary = `Cosmic simulation fallback active: ${String((error as Error)?.message || "unknown error")}`;
    return {
      systemPrompt: [
        "Cosmic Simulation Mode active.",
        "Cosmic simulation bootstrap encountered a runtime issue and switched to safe fallback context.",
        "Treat this as deterministic Milky Way-scale simulation context with conservative defaults."
      ].join("\n"),
      logsSummary: `Cosmic simulation bootstrap fallback: ${String((error as Error)?.message || "unknown error")}`,
      statusSummary: [
        `Simulation ID: ${simulationId}`,
        "Status: degraded",
        "Progress: 0% (0/1 steps)",
        `Summary: ${resultSummary}`
      ].join("\n"),
      chatSummary: [
        "Cosmic simulation is in degraded fallback mode.",
        resultSummary,
        "Export still returns the fallback context snapshot."
      ].join("\n"),
      exportPayload: {
        fileName: `${simulationId}.json`
      },
      state: {
        simulationId,
        status: "degraded",
        stepsExecuted: 0,
        targetSteps: 1,
        completionPercentage: 0,
        resultSummary
      }
    };
  }
}

async function buildMultiverseSimulationContext(messages: IONMessage[]): Promise<{
  systemPrompt: string;
  logsSummary: string;
  statusSummary: string;
  chatSummary: string;
  exportPayload: {
    fileName: string;
  };
  state: {
    simulationId: string;
    status: string;
    stepsExecuted: number;
    targetSteps: number;
    completionPercentage: number;
    resultSummary: string;
  };
}> {
  try {
    const latestUserText = getLatestUserText(messages);
    const textSize = Math.max(1, String(latestUserText || "").length);
    const lodLevel = Math.max(1, Math.min(7, Math.ceil(textSize / 180))) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
    const queryRadius = Number((0.5 + lodLevel * 0.75).toFixed(2));
    const bootstrap = initializeMultiverseMode(0x7a3f9c2e1b8d4f06n);

    const result = await bootstrap.engine.query({
      type: "sphere",
      coordinates: { system: "cartesian_mpc", values: [0, 0, 0], radius: queryRadius },
      lodLevel,
      maxResults: 128
    });

    const queryResult = {
      entities: (result?.entities || []).map((entry) => ({
        id: String(entry?.id || "entity"),
        entityType: String(entry?.entityType || "unknown"),
        redshift: safeNumber(entry?.redshift, 0)
      })),
      metadata: {
        generatedCount: Math.max(0, Math.floor(safeNumber(result?.metadata?.generatedCount, 0))),
        seedPath: String(result?.metadata?.seedPath || "master -> unknown")
      }
    };

    const sampled = queryResult.entities.slice(0, 3);
    const sampleSummary = sampled.length
      ? sampled.map((item) => `${item.id}:${item.entityType}@z=${safeFixed(item.redshift, 3)}`).join(", ")
      : "pending deterministic sample";
    const simulationId = `multiverse-${Date.now()}`;
    const resultSummary = `Multiverse query generated ${queryResult.metadata.generatedCount} scoped entities at LOD ${lodLevel}.`;

    const systemPrompt = [
      "Multiverse Mode active.",
      "Treat this as deterministic observable-universe-scale simulation context.",
      `LOD=${lodLevel}, queryRadius=${queryRadius} Mpc, coverage=98-99% scoped generation.`,
      `Seed path root: ${queryResult.metadata.seedPath}.`
    ].join("\n");

    const logsSummary = [
      `Multiverse engine initialized with sovereign deterministic seed.`,
      `Generated entities (request scope): ${queryResult.metadata.generatedCount}.`,
      `Sample entities: ${sampleSummary}.`
    ].join("\n");

    const statusSummary = [
      `Simulation ID: ${simulationId}`,
      "Status: completed",
      "Progress: 100% (1/1 steps)",
      `Summary: ${resultSummary}`
    ].join("\n");

    const chatSummary = [
      "Multiverse simulation completed for the current query scope.",
      resultSummary,
      `Sample entities: ${sampleSummary}`,
      "Export is available as a JSON snapshot for chat or download."
    ].join("\n");

    return {
      systemPrompt,
      logsSummary,
      statusSummary,
      chatSummary,
      exportPayload: {
        fileName: `${simulationId}.json`
      },
      state: {
        simulationId,
        status: "completed",
        stepsExecuted: 1,
        targetSteps: 1,
        completionPercentage: 100,
        resultSummary
      }
    };
  } catch (error) {
    const simulationId = `multiverse-${Date.now()}`;
    const resultSummary = `Multiverse simulation fallback active: ${String((error as Error)?.message || "unknown error")}`;
    return {
      systemPrompt: [
        "Multiverse Mode active.",
        "Multiverse simulation bootstrap encountered a runtime issue and switched to safe fallback context.",
        "Treat this as deterministic observable-universe-scale context with conservative defaults."
      ].join("\n"),
      logsSummary: `Multiverse simulation bootstrap fallback: ${String((error as Error)?.message || "unknown error")}`,
      statusSummary: [
        `Simulation ID: ${simulationId}`,
        "Status: degraded",
        "Progress: 0% (0/1 steps)",
        `Summary: ${resultSummary}`
      ].join("\n"),
      chatSummary: [
        "Multiverse simulation is in degraded fallback mode.",
        resultSummary,
        "Export still returns the fallback context snapshot."
      ].join("\n"),
      exportPayload: {
        fileName: `${simulationId}.json`
      },
      state: {
        simulationId,
        status: "degraded",
        stepsExecuted: 0,
        targetSteps: 1,
        completionPercentage: 0,
        resultSummary
      }
    };
  }
}

function summarizeConversationSnippet(value: string, maxLen = 200): string {
  const compact = sanitizePromptText(String(value || "")).trim();
  if (!compact) return "";
  if (compact.length <= maxLen) return compact;
  return `${compact.slice(0, Math.max(0, maxLen - 3))}...`;
}

function buildConversationDigest(messages: IONMessage[], limit = 6): string {
  const turns = (messages || [])
    .filter((message) => message?.role === "user" || message?.role === "assistant")
    .slice(-Math.max(2, limit));

  if (!turns.length) return "";

  return turns
    .map((turn, index) => {
      const role = String(turn.role || "user").toUpperCase();
      const content = summarizeConversationSnippet(String(turn.content || ""), 170);
      return `${index + 1}. [${role}] ${content}`;
    })
    .join("\n");
}

function buildReasoningPlannerPrompt(input: {
  mode: string;
  latestUserText: string;
  conversationDigest: string;
  conversationHints: ReturnType<typeof normalizeConversationHints>;
}): string {
  const mode = sanitizePromptText(String(input.mode || "auto")).trim().toLowerCase() || "auto";
  const latestUserText = summarizeConversationSnippet(String(input.latestUserText || ""), 260);
  const digest = String(input.conversationDigest || "").trim();
  const hints = input.conversationHints;

  const hintBlock = [
    `Inferred mode: ${hints.inferredMode || mode}`,
    `Requested output style: ${hints.requestedOutput || "general"}`,
    hints.latestUserIntent ? `Latest intent: ${hints.latestUserIntent}` : "",
    hints.recentUserFocus.length ? `Recent user focus: ${hints.recentUserFocus.map((item, idx) => `(${idx + 1}) ${item}`).join(" | ")}` : "",
    hints.recentAssistantCommitments.length
      ? `Recent assistant commitments: ${hints.recentAssistantCommitments.map((item, idx) => `(${idx + 1}) ${item}`).join(" | ")}`
      : ""
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "Reasoning plan before answering:",
    "1) Identify the exact task and any explicit output-format request.",
    "2) Prefer user-provided context, memory, and retrieved evidence over assumptions.",
    "3) Keep response mode-consistent and avoid drift into unrelated domains.",
    "4) If no format is specified, choose the structure that best serves the task instead of forcing a default template.",
    "5) Before finalizing, run a short self-check for contradictions and missing constraints.",
    "",
    `Mode context: ${mode}`,
    latestUserText ? `Latest user text: ${latestUserText}` : "",
    hintBlock ? `Conversation hints:\n${hintBlock}` : "",
    digest ? `Recent conversation digest:\n${digest}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function inferFlexibleResponseShape(latestUserText: string, requestedOutput: string): string {
  const explicit = sanitizePromptText(String(requestedOutput || "")).trim().toLowerCase();
  if (explicit && explicit !== "general") {
    return explicit;
  }

  const text = sanitizePromptText(String(latestUserText || "")).trim().toLowerCase();
  if (!text) return "adaptive";

  if (/\b(json|yaml|xml|csv)\b/.test(text)) return "structured data";
  if (/\b(code|script|snippet|function|component|tsx|typescript|javascript|python|sql|regex|bash|powershell|shell)\b/.test(text)) return "code block";
  if (/\b(table|matrix|columns|tabular|spreadsheet)\b/.test(text)) return "table";
  if (/\b(bullet|bullets|list|checklist|steps|outline)\b/.test(text)) return "bullet list";
  if (/\b(quote|quotes|excerpt|excerpts|citation|citations)\b/.test(text)) return "quoted excerpt";
  if (/\b(annotation|annotate|annotations|commentary|commented)\b/.test(text)) return "annotated notes";
  if (/\b(graph|chart|plot|timeline|diagram|ascii|text graph|text chart|text visual|box drawing)\b/.test(text)) return "text visual";
  if (/\b(compare|comparison|pros and cons|trade-?off|versus|vs\.?|options)\b/.test(text)) return "comparison layout";
  return "adaptive";
}

function buildFlexibleResponsePrompt(input: {
  latestUserText: string;
  requestedOutput: string;
  route: string;
  mode: string;
}): string {
  const preferredShape = inferFlexibleResponseShape(input.latestUserText, input.requestedOutput);

  return [
    "Response Flexibility Layer is active.",
    `Mode context: ${sanitizePromptText(String(input.mode || "auto")) || "auto"}`,
    `Preferred response shape: ${preferredShape}`,
    `Active route: ${sanitizePromptText(String(input.route || "chat")) || "chat"}`,
    "Match the user's requested format exactly when they specify one.",
    "If the user does not specify a format, choose the most useful shape for the task.",
    "Valid response shapes include plain text, paragraphs, bullet lists, numbered steps, excerpts, annotations, quotes, compact data layouts, symbols, fenced code blocks, copyable scripts, tables, and text-based visuals such as ASCII charts or diagrams.",
    "Do not force every answer into the same style, and do not add image-description boilerplate unless the user explicitly asks for an image analysis or caption."
  ].join("\n");
}

function buildSourceDisciplinePrompt(input: {
  freshnessSensitive: boolean;
  internetSearchRequested: boolean;
  internetHitCount: number;
  weatherLoaded: boolean;
}): string {
  return [
    "Source Discipline Layer is active.",
    input.freshnessSensitive
      ? "This request is freshness-sensitive. Treat it as a live-data question."
      : "Use external context only when it is relevant and available.",
    input.internetSearchRequested
      ? "This request depends on external lookup. Prefer retrieved web evidence over model memory."
      : "External lookup is optional for this request.",
    `Internet hits loaded: ${input.internetHitCount}.`,
    `Weather context loaded: ${input.weatherLoaded}.`,
    "If external facts are present, answer from that retrieved context and keep claims aligned with those sources.",
    "If external lookup was needed but the retrieved evidence is missing or too thin, say that you could not verify the answer instead of guessing.",
    "For freshness-sensitive questions, be explicit that the answer depends on current source data.",
    "Never invent schedules, scores, prices, releases, headlines, or other time-sensitive facts."
  ].join("\n");
}

function parseDepartment(value: unknown): Department | null {
  const text = sanitizePromptText(String(value || "")).trim();
  if (text === "Research" || text === "Ops" || text === "Finance" || text === "Creative" || text === "Infra") {
    return text;
  }

  return null;
}

function parsePriority(value: unknown): Priority | null {
  const text = sanitizePromptText(String(value || "")).trim().toLowerCase();
  if (text === "low" || text === "normal" || text === "high" || text === "critical") {
    return text;
  }

  return null;
}

function parseBlackwellProfilesFromConfig(): AgentProfile[] {
  const root = blackwellAgentProfilesConfig as { agents?: unknown };
  const rawAgents = Array.isArray(root?.agents) ? root.agents : [];

  const profiles = rawAgents
    .map((agent): AgentProfile | null => {
      if (!agent || typeof agent !== "object") return null;
      const record = agent as Record<string, unknown>;
      const id = sanitizePromptText(String(record.id || "")).trim();
      const role = sanitizePromptText(String(record.role || "")).trim();
      const departmentRaw = sanitizePromptText(String(record.department || "")).trim();
      const ritual = sanitizePromptText(String(record.ritual || "")).trim();
      const handoff_targets = Array.isArray(record.handoff_targets)
        ? record.handoff_targets.map((target) => sanitizePromptText(String(target || "")).trim()).filter(Boolean)
        : [];

      const isRoleValid =
        role === "Engineer" || role === "Synthesizer" || role === "Archivist" || role === "Analyst" || role === "Manager";
      const isDepartmentValid =
        departmentRaw === "Research" ||
        departmentRaw === "Ops" ||
        departmentRaw === "Finance" ||
        departmentRaw === "Creative" ||
        departmentRaw === "Infra" ||
        departmentRaw === "All";

      if (!id || !isRoleValid || !isDepartmentValid || !ritual) {
        return null;
      }

      return {
        id,
        role,
        department: departmentRaw,
        ritual,
        handoff_targets
      } as AgentProfile;
    })
    .filter((profile): profile is AgentProfile => Boolean(profile));

  if (profiles.length > 0) {
    return profiles;
  }

  return [
    {
      id: "agent.conductor.blackwell",
      role: "Manager",
      department: "Ops",
      ritual: "Keep the pantheon in motion. No shard dies in silence.",
      handoff_targets: []
    }
  ];
}

function normalizeSafetyProfile(raw: IONRequestBody["safetyProfile"] | ImageRequestBody["safetyProfile"]): SafetyProfile {
  const tier = String(raw?.ageTier || "adult").trim().toLowerCase() === "adult" ? "adult" : "minor";
  const humanVerified = Boolean(raw?.humanVerified);
  const adultAccess = Boolean(raw?.adultAccess) && tier === "adult";
  const legalAttestation = raw?.legalAttestation;
  const rawJurisdiction = String(legalAttestation?.jurisdiction || "").trim().toUpperCase();
  const jurisdiction = /^[A-Z]{2}$/.test(rawJurisdiction) ? rawJurisdiction : "";

  return {
    ageTier: tier,
    humanVerified,
    adultAccess,
    explicitAllowed: Boolean(raw?.explicitAllowed) && adultAccess,
    illegalBlocked: raw?.illegalBlocked !== false,
    legalAttestation: {
      accepted: Boolean(legalAttestation?.accepted),
      jurisdiction,
      truthfulIdentity: Boolean(legalAttestation?.truthfulIdentity),
      lawfulUse: Boolean(legalAttestation?.lawfulUse),
      userDirected: Boolean(legalAttestation?.userDirected),
      acceptedAt: Number(legalAttestation?.acceptedAt || 0)
    }
  };
}

function shouldUseDirectFallbackOnPrompt403(env: Env): boolean {
  return isEnabledFlag(env.ION_IMAGE_DIRECT_FALLBACK_ON_PROMPT_403);
}

function getRequestCountryCode(request: Request): string {
  const cf = (request as any)?.cf || {};
  const raw = String(cf?.country || "").trim().toUpperCase();
  if (!raw || raw === "XX" || raw === "T1") return "";
  return /^[A-Z]{2}$/.test(raw) ? raw : "";
}

function evaluateLegalAttestation(
  _safetyProfile: SafetyProfile,
  request: Request
): { blocked: boolean; code: string; error: string } {
  return {
    blocked: false,
    code: getRequestCountryCode(request) || "allowed",
    error: ""
  };
}

function evaluateSexualSafetyPrompt(text: string, safetyProfile: SafetyProfile): { blocked: boolean; reason: string } {
  const input = String(text || "").toLowerCase();

  const directIllegalPattern = /\b(bestiality|child\s*sexual\s*abuse|child\s*porn|csam|rape\s*content|exploitative\s*sexual\s*content|incest\s*porn)\b/i;
  const illegalMinorSexualPattern = /\b(child|minor|underage|teen)\b[\s\S]{0,35}\b(sex|sexual\s*content|nude|nudity|porn|erotic|fetish|explicit\s*nudity)\b/i;
  const illegalAssaultPattern = /\b(sexual\s*assault|forced\s*sex|non[-\s]?consensual\s*sex)\b/i;

  if (directIllegalPattern.test(input) || illegalMinorSexualPattern.test(input) || illegalAssaultPattern.test(input)) {
    return { blocked: true, reason: "illegal-content-blocked" };
  }

  return { blocked: false, reason: "allowed" };
}

const INTERNET_MODE_PROFILES: Record<string, InternetSearchProfile> = {
  auto: { queryPrefix: "overview", querySuffix: "latest", limit: 4 },
  architect: { queryPrefix: "architecture patterns", querySuffix: "design tradeoffs", limit: 5 },
  analyst: { queryPrefix: "analysis", querySuffix: "evidence", limit: 5 },
  visual: { queryPrefix: "visual design", querySuffix: "examples", limit: 4 },
  lore: { queryPrefix: "history", querySuffix: "timeline", limit: 4 },
  reasoning: { queryPrefix: "explain", querySuffix: "why", limit: 4 },
  coding: { queryPrefix: "developer docs", querySuffix: "implementation", limit: 5 },
  knowledge: { queryPrefix: "reference", querySuffix: "facts", limit: 5 },
  "system-knowledge": { queryPrefix: "systems engineering", querySuffix: "best practices", limit: 5 },
  anatomy: { queryPrefix: "human anatomy systems", querySuffix: "integration", limit: 4 },
  simulation: { queryPrefix: "simulation methods", querySuffix: "models", limit: 3 },
  cosmic: { queryPrefix: "galactic dynamics", querySuffix: "milky way simulation", limit: 3 },
  multiverse: { queryPrefix: "cosmology and large scale structure", querySuffix: "lcdm planck 2018", limit: 3 }
};

function normalizeInternetMode(mode: string): keyof typeof INTERNET_MODE_PROFILES {
  const normalized = String(mode || "auto").trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(INTERNET_MODE_PROFILES, normalized)) {
    return normalized as keyof typeof INTERNET_MODE_PROFILES;
  }
  return "auto";
}

function buildInternetQueries(mode: string, userText: string): string[] {
  const key = normalizeInternetMode(mode);
  const profile = INTERNET_MODE_PROFILES[key];
  const base = sanitizePromptText(String(userText || "")).trim();
  if (!base) return [];

  const primary = `${profile.queryPrefix} ${base} ${profile.querySuffix}`.replace(/\s+/g, " ").trim();
  const fallback = `${base} ${profile.querySuffix}`.replace(/\s+/g, " ").trim();
  return [...new Set([primary, fallback].filter(Boolean))];
}

function isFreshnessSensitiveQuery(userText: string): boolean {
  const value = sanitizePromptText(String(userText || "")).trim().toLowerCase();
  if (!value) return false;

  return /\b(today|tonight|tomorrow|current|currently|latest|live|now|right now|recent|recently|this week|this weekend|schedule|schedules|games|game|match|matches|playing|score|scores|standings|odds|price|prices|stock|weather|forecast|traffic|news|breaking|release date|availability)\b/i.test(value);
}

function isGeneralInternetLookupQuery(userText: string): boolean {
  const value = sanitizePromptText(String(userText || "")).trim();
  if (!value) return false;

  const factualPattern = /\b(who is|who are|what is|what are|when is|when did|where is|where are|which is|which are|how many|how much|find|search|lookup|look up|show me|list|official site|official website|homepage|documentation|docs|guide|reference|compare|vs\.?|benchmark|release|update|price|population|capital|schedule|games|game|news)\b/i;
  const questionPattern = /\?$/;
  const internalPattern = /\b(ion|ion ai|ionirix|repo|repository|workspace|dashboard|project|codebase|code|file|component|route|worker|build)\b/i;

  return factualPattern.test(value) || (questionPattern.test(value) && !internalPattern.test(value));
}

function isNBAScheduleQuery(userText: string): boolean {
  const value = sanitizePromptText(String(userText || "")).trim().toLowerCase();
  if (!value) return false;

  return /\b(nba|basketball)\b/i.test(value) && /\b(game|games|schedule|matchup|matchups|playing|today|tonight|on today)\b/i.test(value);
}

function isStockMarketQuery(userText: string): boolean {
  const value = sanitizePromptText(String(userText || "")).trim().toLowerCase();
  if (!value) return false;

  return /\b(stock market|market today|markets today|dow|s&p|s and p|nasdaq|index|indexes|indices|futures|stocks today|equities)\b/i.test(value);
}

function formatDateForScoreboard(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return formatter.format(new Date()).replace(/-/g, "");
}

async function searchNBASchedule(userText: string): Promise<InternetSearchHit[]> {
  if (!isNBAScheduleQuery(userText)) {
    return [];
  }

  const scoreboardDate = formatDateForScoreboard("America/New_York");
  const apiUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${scoreboardDate}`;
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      "User-Agent": "IONAi/1.0 (+live-sports-retrieval)"
    }
  });
  if (!response.ok) return [];

  const payload = (await response.json()) as any;
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const dateLabel = `${scoreboardDate.slice(0, 4)}-${scoreboardDate.slice(4, 6)}-${scoreboardDate.slice(6, 8)}`;
  const scoreboardUrl = `https://www.espn.com/nba/scoreboard/_/date/${scoreboardDate}`;

  if (!events.length) {
    return [
      {
        title: `NBA schedule for ${dateLabel}`,
        snippet: `ESPN scoreboard reports no NBA games scheduled for ${dateLabel}.`,
        url: scoreboardUrl,
        source: "espn"
      }
    ];
  }

  return events.slice(0, 10).map((event: any) => {
    const competition = Array.isArray(event?.competitions) ? event.competitions[0] : null;
    const competitors = Array.isArray(competition?.competitors) ? competition.competitors : [];
    const away = competitors.find((team: any) => team?.homeAway === "away");
    const home = competitors.find((team: any) => team?.homeAway === "home");
    const awayName = sanitizePromptText(String(away?.team?.displayName || away?.team?.shortDisplayName || "Away Team")).trim();
    const homeName = sanitizePromptText(String(home?.team?.displayName || home?.team?.shortDisplayName || "Home Team")).trim();
    const status = sanitizePromptText(String(competition?.status?.type?.description || event?.status?.type?.description || "Scheduled")).trim();
    const broadcast = Array.isArray(competition?.broadcasts)
      ? competition.broadcasts.map((item: any) => sanitizePromptText(String(item?.names?.[0] || "")).trim()).filter(Boolean).join(", ")
      : "";
    const startTime = sanitizePromptText(String(competition?.date || event?.date || "")).trim();
    const url = sanitizePromptText(String(event?.links?.[0]?.href || competition?.links?.[0]?.href || scoreboardUrl)).trim();

    return {
      title: `${awayName} at ${homeName}`,
      snippet: [
        `NBA scoreboard for ${dateLabel}.`,
        `Status: ${status}.`,
        startTime ? `Start: ${startTime}.` : "",
        broadcast ? `Broadcast: ${broadcast}.` : ""
      ].filter(Boolean).join(" "),
      url,
      source: "espn" as const
    };
  });
}

function formatMarketTimestamp(unixSeconds: number | null | undefined): string {
  if (!Number.isFinite(unixSeconds || NaN)) {
    return "";
  }

  try {
    return new Date(Number(unixSeconds) * 1000).toISOString();
  } catch {
    return "";
  }
}

async function searchStockMarket(userText: string): Promise<InternetSearchHit[]> {
  if (!isStockMarketQuery(userText)) {
    return [];
  }

  const symbols = ["^GSPC", "^DJI", "^IXIC"];
  const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}`;
  const response = await fetch(quoteUrl, {
    method: "GET",
    headers: {
      "User-Agent": "IONAi/1.0 (+market-retrieval)",
      "Accept": "application/json"
    }
  });
  if (!response.ok) return [];

  const payload = (await response.json()) as any;
  const results = Array.isArray(payload?.quoteResponse?.result) ? payload.quoteResponse.result : [];
  if (!results.length) return [];

  return results
    .map((entry: any) => {
      const symbol = sanitizePromptText(String(entry?.symbol || "")).trim();
      const title = sanitizePromptText(String(entry?.shortName || entry?.longName || symbol)).trim();
      const marketState = sanitizePromptText(String(entry?.marketState || "")).trim();
      const price = Number(entry?.regularMarketPrice);
      const change = Number(entry?.regularMarketChange);
      const changePercent = Number(entry?.regularMarketChangePercent);
      const currency = sanitizePromptText(String(entry?.currency || "USD")).trim();
      const quoteTime = formatMarketTimestamp(Number(entry?.regularMarketTime));
      const exchange = sanitizePromptText(String(entry?.fullExchangeName || entry?.exchange || "")).trim();

      if (!title || !Number.isFinite(price)) return null;

      return {
        title,
        snippet: [
          symbol ? `Symbol: ${symbol}.` : "",
          `Price: ${price.toFixed(2)} ${currency}.`,
          Number.isFinite(change) ? `Change: ${change >= 0 ? "+" : ""}${change.toFixed(2)}.` : "",
          Number.isFinite(changePercent) ? `Change %: ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%.` : "",
          marketState ? `Market state: ${marketState}.` : "",
          exchange ? `Exchange: ${exchange}.` : "",
          quoteTime ? `Quote time: ${quoteTime}.` : ""
        ].filter(Boolean).join(" "),
        url: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`,
        source: "yahoo-finance" as const
      };
    })
    .filter((entry: InternetSearchHit | null): entry is InternetSearchHit => Boolean(entry));
}

function flattenDuckDuckGoTopics(items: any[], collector: InternetSearchHit[]): void {
  for (const item of items || []) {
    if (item?.Topics && Array.isArray(item.Topics)) {
      flattenDuckDuckGoTopics(item.Topics, collector);
      continue;
    }

    const title = sanitizePromptText(String(item?.Text || "")).trim();
    const url = sanitizePromptText(String(item?.FirstURL || "")).trim();
    if (!title || !url) continue;

    collector.push({
      title: title.slice(0, 160),
      snippet: title.slice(0, 320),
      url,
      source: "duckduckgo"
    });
  }
}

function decodeHtmlEntities(value: string): string {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x3D;/gi, "=")
    .replace(/&#(\d+);/g, (_match, code) => {
      const value = Number(code);
      return Number.isFinite(value) ? String.fromCharCode(value) : "";
    });
}

function normalizeDuckDuckGoResultUrl(rawUrl: string): string {
  const value = decodeHtmlEntities(String(rawUrl || "")).trim();
  if (!value) return "";

  try {
    const parsed = new URL(value, "https://duckduckgo.com");
    const redirect = parsed.searchParams.get("uddg");
    if (redirect) {
      return decodeURIComponent(redirect);
    }
    return parsed.toString();
  } catch {
    return value;
  }
}

async function searchDuckDuckGoWeb(query: string, limit = 5): Promise<InternetSearchHit[]> {
  const target = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(target, {
    method: "GET",
    headers: {
      "User-Agent": "IONAi/1.0 (+web-search)",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });
  if (!response.ok) return [];

  const html = await response.text();
  const hits: InternetSearchHit[] = [];
  const anchorPattern = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match = anchorPattern.exec(html);

  while (match && hits.length < Math.max(1, limit)) {
    const [fullMatch, href, rawTitle] = match;
    const startIndex = match.index ?? 0;
    const localWindow = html.slice(startIndex, startIndex + Math.max(fullMatch.length + 1200, 1600));
    const snippetMatch = localWindow.match(/<(?:a|div)[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div)>/i);
    const title = sanitizePromptText(stripHtmlToText(decodeHtmlEntities(rawTitle || ""))).trim();
    const snippet = sanitizePromptText(stripHtmlToText(decodeHtmlEntities(snippetMatch?.[1] || ""))).trim();
    const url = sanitizePromptText(normalizeDuckDuckGoResultUrl(href || "")).trim();

    if (title && url) {
      hits.push({
        title: title.slice(0, 160),
        snippet: snippet.slice(0, 400),
        url,
        source: "duckduckgo"
      });
    }

    match = anchorPattern.exec(html);
  }

  return hits;
}

async function enrichInternetHits(hits: InternetSearchHit[], maxInspections = 3): Promise<InternetSearchHit[]> {
  const inspections = await Promise.all(
    hits.slice(0, Math.max(0, maxInspections)).map((hit) => withTimeout(inspectWebsite(hit.url), 1200, null))
  );

  return hits.map((hit, index) => {
    const inspection = index < inspections.length ? inspections[index] : null;
    if (!inspection) return hit;

    return {
      ...hit,
      title: sanitizePromptText(String(inspection.title || hit.title)).slice(0, 160) || hit.title,
      snippet: sanitizePromptText(String(inspection.contentPreview || inspection.excerpt || hit.snippet)).slice(0, 400) || hit.snippet,
      url: inspection.url || hit.url
    };
  });
}

async function searchDuckDuckGo(query: string, limit = 4): Promise<InternetSearchHit[]> {
  const target = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&no_redirect=1`;
  const response = await fetch(target, { method: "GET" });
  if (!response.ok) return [];

  const data = (await response.json()) as any;
  const hits: InternetSearchHit[] = [];

  const abstract = sanitizePromptText(String(data?.AbstractText || "")).trim();
  const abstractUrl = sanitizePromptText(String(data?.AbstractURL || "")).trim();
  const heading = sanitizePromptText(String(data?.Heading || "")).trim();
  if (abstract && abstractUrl) {
    hits.push({
      title: heading || "DuckDuckGo Result",
      snippet: abstract.slice(0, 400),
      url: abstractUrl,
      source: "duckduckgo"
    });
  }

  flattenDuckDuckGoTopics(Array.isArray(data?.RelatedTopics) ? data.RelatedTopics : [], hits);
  return hits.slice(0, Math.max(1, limit));
}

async function searchWikipedia(query: string, limit = 4): Promise<InternetSearchHit[]> {
  const target = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${Math.max(1, limit)}&namespace=0&format=json`;
  const response = await fetch(target, { method: "GET" });
  if (!response.ok) return [];

  const data = (await response.json()) as [string, string[], string[], string[]] | unknown;
  if (!Array.isArray(data) || data.length < 4) return [];

  const titles = Array.isArray(data[1]) ? data[1] : [];
  const descriptions = Array.isArray(data[2]) ? data[2] : [];
  const urls = Array.isArray(data[3]) ? data[3] : [];
  const hits: InternetSearchHit[] = [];

  for (let i = 0; i < titles.length; i += 1) {
    const title = sanitizePromptText(String(titles[i] || "")).trim();
    const snippet = sanitizePromptText(String(descriptions[i] || "")).trim();
    const url = sanitizePromptText(String(urls[i] || "")).trim();
    if (!title || !url) continue;

    hits.push({
      title: title.slice(0, 160),
      snippet: snippet.slice(0, 400),
      url,
      source: "wikipedia"
    });
  }

  return hits.slice(0, Math.max(1, limit));
}

function dedupeInternetHits(hits: InternetSearchHit[], limit: number): InternetSearchHit[] {
  const out: InternetSearchHit[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    const key = `${hit.url}|${hit.title}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
    if (out.length >= limit) break;
  }
  return out;
}

async function performModeAwareInternetSearch(mode: string, userText: string): Promise<{ profile: InternetSearchProfile; hits: InternetSearchHit[] }> {
  const key = normalizeInternetMode(mode);
  const profile = INTERNET_MODE_PROFILES[key];
  const sportsHits = await searchNBASchedule(userText);
  if (sportsHits.length) {
    return {
      profile,
      hits: dedupeInternetHits(sportsHits, Math.max(profile.limit, sportsHits.length))
    };
  }

  const marketHits = await searchStockMarket(userText);
  if (marketHits.length) {
    return {
      profile,
      hits: dedupeInternetHits(marketHits, Math.max(profile.limit, marketHits.length))
    };
  }

  const queries = buildInternetQueries(key, userText);
  if (!queries.length) {
    return { profile, hits: [] };
  }

  const collected: InternetSearchHit[] = [];
  for (const query of queries.slice(0, 2)) {
    const [ddgWeb, ddg, wiki] = await Promise.all([
      searchDuckDuckGoWeb(query, profile.limit + 1),
      searchDuckDuckGo(query, profile.limit),
      searchWikipedia(query, profile.limit)
    ]);
    collected.push(...ddgWeb, ...ddg, ...wiki);
    if (collected.length >= profile.limit * 2) break;
  }

  const deduped = dedupeInternetHits(collected, Math.max(profile.limit + 2, 6));
  const enriched = await enrichInternetHits(deduped, Math.min(3, deduped.length));

  return {
    profile,
    hits: dedupeInternetHits(enriched, profile.limit)
  };
}

function shouldUseInternetSearch(userText: string, mode: string): boolean {
  const value = String(userText || "").trim();
  if (!value) return false;
  if (isNBAScheduleQuery(value)) return true;
  if (isGeneralInternetLookupQuery(value)) return true;
  const normalized = normalizeInternetMode(mode);
  if (normalized === "simulation" || normalized === "cosmic" || normalized === "multiverse") return false;
  const intentPattern = /\b(latest|current|today|news|recent|what is|how to|documentation|docs|guide|compare|vs\.?|benchmark|release|update)\b/i;
  return intentPattern.test(value);
}

function shouldUseWeatherContext(userText: string): boolean {
  const value = String(userText || "").trim().toLowerCase();
  if (!value) return false;
  return /\b(weather|temperature|forecast|rain|snow|humidity|wind|climate)\b/i.test(value);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
      })
    ]);
  } catch {
    return fallback;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function extractProviderToken(rawLine: string): string {
  const line = String(rawLine || "").trim();
  if (!line || line === "[DONE]") return "";

  try {
    const parsed = JSON.parse(line) as any;
    const fromChoices = parsed?.choices?.[0];
    const value =
      parsed?.response ??
      parsed?.output_text ??
      parsed?.text ??
      parsed?.content ??
      fromChoices?.delta?.content ??
      fromChoices?.message?.content ??
      "";

    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value)) {
      return value.filter((item: unknown) => typeof item === "string").join("");
    }

    if (value && typeof value === "object") {
      if (typeof value.text === "string") return value.text;
      if (typeof value.content === "string") return value.content;
      if (Array.isArray(value.parts)) {
        return value.parts.filter((item: unknown) => typeof item === "string").join("");
      }
    }

    return "";
  } catch {
    return line;
  }
}

function createIONSseFromProviderStream(options: {
  providerStream: ReadableStream;
  route: string;
  multimodalPayload?: Record<string, unknown> | null;
  initialPayload?: Record<string, unknown> | null;
  onComplete?: (fullText: string) => void;
}): ReadableStream {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = options.providerStream.getReader();

  return new ReadableStream({
    start(controller) {
      let pending = "";
      let firstChunkSent = false;
      let fullText = "";

      const emitChunk = (content: string) => {
        if (!content) return;
        fullText += content;
        const payload = firstChunkSent
          ? { content }
          : { content, route: options.route, ...(options.multimodalPayload || {}), ...(options.initialPayload || {}) };
        firstChunkSent = true;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const pump = async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunkText = typeof value === "string"
              ? value
              : decoder.decode(value, { stream: true });
            pending += chunkText;
            const lines = pending.split(/\r?\n/);
            pending = lines.pop() || "";

            for (const line of lines) {
              const trimmed = String(line || "").trim();
              if (!trimmed) continue;
              const payload = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
              if (payload === "[DONE]") continue;
              emitChunk(extractProviderToken(payload));
            }
          }

          const trailing = pending.trim();
          if (trailing) {
            const payload = trailing.startsWith("data:") ? trailing.slice(5).trim() : trailing;
            emitChunk(extractProviderToken(payload));
          }
        } catch {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: "Streaming interrupted. Continuing with partial output." })}\n\n`)
          );
        } finally {
          options.onComplete?.(fullText);
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      };

      void pump();
    },
    cancel() {
      void reader.cancel();
    }
  });
}

function buildSimulationExportUrls(request: Request, sessionId: string): { exportUrl: string; downloadUrl: string } {
  const exportUrl = new URL("/api/ION/simulation/export", request.url);
  if (sessionId && sessionId !== "anon") {
    exportUrl.searchParams.set("sid", sessionId);
  }

  const downloadUrl = new URL(exportUrl.toString());
  downloadUrl.searchParams.set("download", "1");

  return {
    exportUrl: exportUrl.toString(),
    downloadUrl: downloadUrl.toString()
  };
}

function buildSimulationClientPayload(
  request: Request,
  sessionId: string,
  simulationContext: {
    state: {
      simulationId: string;
      status: string;
      stepsExecuted: number;
      targetSteps: number;
      completionPercentage: number;
      resultSummary: string;
    };
    chatSummary: string;
    exportPayload: {
      fileName: string;
    };
  }
): Record<string, unknown> {
  const urls = buildSimulationExportUrls(request, sessionId);

  return {
    simulation: {
      simulationId: simulationContext.state.simulationId,
      status: simulationContext.state.status,
      stepsExecuted: simulationContext.state.stepsExecuted,
      targetSteps: simulationContext.state.targetSteps,
      completionPercentage: simulationContext.state.completionPercentage,
      resultSummary: simulationContext.state.resultSummary,
      chatReport: simulationContext.chatSummary,
      export: {
        url: urls.exportUrl,
        downloadUrl: urls.downloadUrl,
        fileName: simulationContext.exportPayload.fileName
      }
    }
  };
}

function inferWeatherLocation(userText: string, request: Request): string {
  const value = sanitizePromptText(String(userText || "")).trim();
  const explicitLocationMatches = Array.from(value.matchAll(/\b(?:in|for|at)\s+([a-zA-Z][a-zA-Z\s\-'.]{1,40}(?:,\s*[A-Za-z]{2,})?)/gi));
  const explicitLocation = explicitLocationMatches.length ? explicitLocationMatches[explicitLocationMatches.length - 1] : null;
  if (explicitLocation && explicitLocation[1]) {
    const cleaned = explicitLocation[1]
      .replace(/^(?:in|for|at)\s+/i, "")
      .replace(/\b(today|tonight|tomorrow|now|right now|currently|current|weather|forecast)\b/gi, " ")
      .replace(/\s+/g, " ")
      .replace(/\s+,/g, ",")
      .trim()
      .replace(/[?.!,;:]+$/g, "");
    if (cleaned) {
      return sanitizePromptText(cleaned);
    }
  }

  const trailingLocation = value.match(/\b([A-Za-z][A-Za-z\s\-'.]{1,40}(?:,\s*[A-Za-z]{2,})?)\s*\??$/);
  if (trailingLocation && trailingLocation[1] && shouldUseWeatherContext(value)) {
    const cleaned = trailingLocation[1]
      .replace(/\b(weather|forecast|today|tonight|tomorrow|current|currently|now|right now)\b/gi, " ")
      .replace(/\s+/g, " ")
      .replace(/\s+,/g, ",")
      .trim()
      .replace(/[?.!,;:]+$/g, "");
    if (cleaned && /[a-z]/i.test(cleaned)) {
      return sanitizePromptText(cleaned);
    }
  }

  const cf = (request as any)?.cf || {};
  const city = sanitizePromptText(String(cf?.city || "")).trim();
  const region = sanitizePromptText(String(cf?.region || "")).trim();
  const country = sanitizePromptText(String(cf?.country || "")).trim();
  if (city && country) {
    return `${city}, ${country}`;
  }
  if (region && country) {
    return `${region}, ${country}`;
  }
  return "New York";
}

async function fetchWeatherForLocation(location: string): Promise<InternetWeatherResult | null> {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
  const geoResponse = await fetch(geoUrl, { method: "GET" });
  if (!geoResponse.ok) return null;

  const geoData = (await geoResponse.json()) as any;
  const first = Array.isArray(geoData?.results) ? geoData.results[0] : null;
  if (!first) return null;

  const latitude = Number(first.latitude);
  const longitude = Number(first.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const locationLabel = [first.name, first.admin1, first.country].filter(Boolean).join(", ");
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1`;
  const weatherResponse = await fetch(weatherUrl, { method: "GET" });
  if (!weatherResponse.ok) return null;

  const weatherData = (await weatherResponse.json()) as any;
  const current = weatherData?.current_weather;
  if (!current) return null;
  const daily = weatherData?.daily;
  const dailySummary = Array.isArray(daily?.time) && daily.time.length > 0
    ? {
        date: sanitizePromptText(String(daily.time[0] || "")),
        temperatureMaxC: Number(daily.temperature_2m_max?.[0]),
        temperatureMinC: Number(daily.temperature_2m_min?.[0]),
        precipitationProbabilityMax: daily.precipitation_probability_max?.[0] == null
          ? null
          : Number(daily.precipitation_probability_max?.[0])
      }
    : null;

  return {
    location: sanitizePromptText(String(locationLabel || location)),
    latitude,
    longitude,
    temperatureC: Number(current.temperature),
    windSpeedKmh: Number(current.windspeed),
    weatherCode: Number(current.weathercode),
    observationTime: sanitizePromptText(String(current.time || "")),
    timezone: sanitizePromptText(String(weatherData?.timezone || "")),
    dailySummary
  };
}

function stripHtmlToText(html: string): string {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeInspectUrl(rawUrl: string): string | null {
  const value = String(rawUrl || "").trim();
  if (!value) return null;
  try {
    const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function inspectWebsite(urlInput: string): Promise<InternetInspectResult | null> {
  const normalizedUrl = normalizeInspectUrl(urlInput);
  if (!normalizedUrl) return null;

  const response = await fetch(normalizedUrl, {
    method: "GET",
    headers: {
      "User-Agent": "IONAi/1.0 (+internet-inspector)"
    }
  });
  if (!response.ok) return null;

  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const bodyText = await response.text();
  const titleMatch = bodyText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = sanitizePromptText(titleMatch?.[1] || normalizedUrl);

  const text = contentType.includes("html") ? stripHtmlToText(bodyText) : sanitizePromptText(bodyText);
  const excerpt = text.slice(0, 280);
  const contentPreview = text.slice(0, 1600);

  return {
    url: normalizedUrl,
    title: title || normalizedUrl,
    excerpt,
    contentPreview
  };
}

function toLearningFacts(hits: InternetSearchHit[]): InternetLearningFact[] {
  return (hits || []).slice(0, 5).map((hit) => ({
    title: sanitizePromptText(String(hit.title || "")).slice(0, 180),
    snippet: sanitizePromptText(String(hit.snippet || "")).slice(0, 420),
    url: sanitizePromptText(String(hit.url || "")).slice(0, 360),
    source: hit.source
  })).filter((fact) => Boolean(fact.title && fact.url));
}

async function loadInternetLearningStore(env: Env): Promise<InternetLearningStore> {
  if (!env.MEMORY) {
    return { updatedAt: Date.now(), entries: [] };
  }

  const raw = await env.MEMORY.get(INTERNET_LEARNING_KEY);
  if (!raw) {
    return { updatedAt: Date.now(), entries: [] };
  }

  try {
    const parsed = JSON.parse(raw) as InternetLearningStore;
    const entries = Array.isArray(parsed?.entries) ? parsed.entries : [];
    return {
      updatedAt: Number(parsed?.updatedAt || Date.now()),
      entries: entries
        .map((entry) => ({
          id: sanitizePromptText(String(entry?.id || "")).slice(0, 90),
          ts: Number(entry?.ts || 0),
          mode: sanitizePromptText(String(entry?.mode || "auto")).toLowerCase(),
          query: sanitizePromptText(String(entry?.query || "")).slice(0, 300),
          facts: Array.isArray(entry?.facts)
            ? entry.facts.map((fact): InternetLearningFact => ({
                title: sanitizePromptText(String(fact?.title || "")).slice(0, 180),
                snippet: sanitizePromptText(String(fact?.snippet || "")).slice(0, 420),
                url: sanitizePromptText(String(fact?.url || "")).slice(0, 360),
                source:
                  fact?.source === "wikipedia"
                    ? "wikipedia"
                    : fact?.source === "espn"
                      ? "espn"
                      : fact?.source === "yahoo-finance"
                        ? "yahoo-finance"
                      : "duckduckgo"
              })).filter((fact) => Boolean(fact.title && fact.url))
            : []
        }))
        .filter((entry) => Boolean(entry.id && entry.query))
    };
  } catch {
    return { updatedAt: Date.now(), entries: [] };
  }
}

async function saveInternetLearningStore(env: Env, store: InternetLearningStore): Promise<void> {
  if (!env.MEMORY) return;
  await env.MEMORY.put(INTERNET_LEARNING_KEY, JSON.stringify(store));
}

async function recordInternetLearning(env: Env, mode: string, query: string, hits: InternetSearchHit[]): Promise<void> {
  if (!env.MEMORY) return;
  const normalizedQuery = sanitizePromptText(String(query || "")).trim();
  if (!normalizedQuery) return;

  const facts = toLearningFacts(hits);
  if (!facts.length) return;

  const store = await loadInternetLearningStore(env);
  const entry: InternetLearningEntry = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    mode: normalizeInternetMode(mode),
    query: normalizedQuery,
    facts
  };

  const nextEntries = [entry, ...(store.entries || [])].slice(0, INTERNET_LEARNING_MAX_ENTRIES);
  await saveInternetLearningStore(env, {
    updatedAt: Date.now(),
    entries: nextEntries
  });
}

function tokenizeForLearning(text: string): string[] {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4)
    .slice(0, 30);
}

function scoreLearningEntry(entry: InternetLearningEntry, mode: string, queryTokens: string[]): number {
  let score = 0;
  if (entry.mode === normalizeInternetMode(mode)) score += 3;

  const haystack = `${entry.query} ${entry.facts.map((fact) => `${fact.title} ${fact.snippet}`).join(" ")}`.toLowerCase();
  for (const token of queryTokens) {
    if (haystack.includes(token)) score += 1;
  }

  return score;
}

async function getInternetLearningContext(env: Env, mode: string, query: string, limit = 4): Promise<string> {
  const store = await loadInternetLearningStore(env);
  const entries = Array.isArray(store.entries) ? store.entries : [];
  if (!entries.length) return "";

  const tokens = tokenizeForLearning(query);
  const ranked = entries
    .map((entry) => ({ entry, score: scoreLearningEntry(entry, mode, tokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit));

  if (!ranked.length) return "";

  return ranked
    .map(({ entry }, index) => {
      const topFacts = entry.facts.slice(0, 2)
        .map((fact) => `- [${fact.source}] ${fact.title}: ${fact.snippet} (${fact.url})`)
        .join("\n");
      return `(${index + 1}) mode=${entry.mode}, query=${entry.query}\n${topFacts}`;
    })
    .join("\n\n---\n\n");
}

function makeContextSystemMessage(label: string, content: string): IONMessage {
  return {
    role: "system",
    content: `[${label}]\n${content}`
  };
}

function resolveSessionId(request: Request): string {
  const url = new URL(request.url);
  const headerSession = String(request.headers.get("x-ION-session-id") || "").trim();
  const querySession = String(url.searchParams.get("sid") || "").trim();
  const raw = headerSession || querySession || "anon";
  return raw.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 120) || "anon";
}

function getBearerToken(request: Request): string {
  const authHeader = String(request.headers.get("Authorization") || request.headers.get("authorization") || "").trim();
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  const cookieHeader = String(request.headers.get("Cookie") || request.headers.get("cookie") || "");
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)ion_token=([^;]+)/);
  return cookieMatch ? decodeURIComponent(cookieMatch[1]) : "";
}

async function resolveAuthenticatedChatContext(request: Request, env: Env): Promise<{ sessionId: string; userId: string } | null> {
  if (!env.ION_DB) return null;

  const token = getBearerToken(request);
  if (!token) return null;

  try {
    const auth = await getSessionByToken(env.ION_DB, token);
    if (!auth) return null;
    await touchSession(env.ION_DB, auth.session.id);
    return {
      sessionId: auth.session.id,
      userId: auth.user.id
    };
  } catch {
    return null;
  }
}

function isAdminAuthorized(request: Request, env: Env): boolean {
  const explicitEnv = String(env.ION_ENV || "").trim().toLowerCase();
  const isProduction = explicitEnv === "production";
  const configured = String(env.ION_ADMIN_KEY || "").trim();
  if (!configured) return !isProduction;

  const provided = String(request.headers.get("x-ION-admin-key") || "").trim();
  return provided.length > 0 && provided === configured;
}

function resolveInternalMindMode(value: string): InternalMindMode | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "improvement" || normalized === "patch" || normalized === "tasks") {
    return normalized;
  }
  return null;
}

function buildInternalMindImprovementResponse(payload: InternalMindRequestBody): Record<string, unknown> {
  const evaluation = payload?.evaluation || {};
  const sessionId = sanitizePromptText(String(evaluation.sessionId || "")).trim() || "unknown";
  const score = clamp(Number(evaluation.score || 0.78), 0, 1);
  const qualityScore = clamp(Number(evaluation.qualityScore || Math.min(1, score + 0.03)), 0, 1);
  const latencyScore = clamp(Number(evaluation.latencyScore || Math.max(0, score - 0.05)), 0, 1);
  const reliabilityScore = clamp(Number(evaluation.reliabilityScore || score), 0, 1);
  const safetyScore = clamp(Number(evaluation.safetyScore || Math.min(1, score + 0.08)), 0, 1);

  const issues = [
    ...(Array.isArray(evaluation.issues) ? evaluation.issues : []),
    ...(Array.isArray(evaluation.findings) ? evaluation.findings : [])
  ]
    .map((issue) => sanitizePromptText(String(issue || "")).trim())
    .filter(Boolean)
    .slice(0, 8);

  const normalizedIssues = issues.length
    ? issues
    : [
        "Session evaluation did not provide explicit issues; monitor next run for concrete drift signals."
      ];

  const proposals: Array<Record<string, unknown>> = [];
  if (qualityScore < 0.8) {
    proposals.push({
      type: "prompt",
      area: "response-quality",
      summary: "Tighten response-executability guidance in system prompts",
      details: "Require explicit file paths, concrete commands, and measurable acceptance criteria in generated plans.",
      safeToApply: true
    });
  }

  if (latencyScore < 0.72 || reliabilityScore < 0.9) {
    proposals.push({
      type: "task-token",
      area: "runtime-reliability",
      summary: "Create reliability hardening task token from mind evaluation",
      details: "Track retries, transient failure handling, and fallback path consistency across critical routes.",
      safeToApply: true,
      taskToken: {
        type: "refactor",
        summary: "Harden reliability and fallback handling in critical routes",
        contextFiles: ["src/index.ts", "src/mind/evaluators/sessionEvaluator.ts"],
        acceptanceCriteria: [
          "Reliability score recovers above 0.90 in subsequent sampled sessions",
          "No repeated transient-failure issue appears in two consecutive evaluations"
        ]
      }
    });
  }

  if (safetyScore < 0.98) {
    proposals.push({
      type: "task-token",
      area: "safety",
      summary: "Generate safety review token for policy boundary verification",
      details: "Review moderation classification traces and policy gate ordering for consistency.",
      safeToApply: false,
      taskToken: {
        type: "research",
        summary: "Audit safety gate ordering and moderation traces",
        contextFiles: ["src/index.ts", "codex/20-protocols.md"],
        acceptanceCriteria: [
          "Safety gate ordering documented",
          "Policy boundary tests added to maintenance checklist"
        ]
      }
    });
  }

  if (!proposals.length) {
    proposals.push({
      type: "task-token",
      area: "codex-update",
      summary: "Record healthy mind-evaluation snapshot",
      details: "No immediate corrective action required; keep trend monitoring active.",
      safeToApply: true,
      taskToken: {
        type: "codex-update",
        summary: "Append healthy internal mind-evaluation snapshot",
        contextFiles: ["codex/40-decisions"],
        acceptanceCriteria: [
          "Snapshot includes score breakdown and top findings",
          "No unresolved high-priority token remains active"
        ]
      }
    });
  }

  return {
    mode: "improvement",
    sessionId,
    score,
    metrics: {
      qualityScore,
      latencyScore,
      reliabilityScore,
      safetyScore
    },
    issues: normalizedIssues,
    proposals
  };
}

function buildInternalMindPatchResponse(payload: InternalMindRequestBody): Record<string, unknown> {
  const errorLog = sanitizePromptText(String(payload?.errorLog || "")).trim() || "No error log provided.";
  const contextFiles = Array.isArray(payload?.context?.files) ? payload.context.files : [];
  const primaryFile = contextFiles
    .map((file) => sanitizePromptText(String(file?.path || "")).trim())
    .find(Boolean) || "src/index.ts";

  const explanation =
    "The failure likely comes from an unguarded assumption in the failing path; introduce validation guards and safe fallbacks before dereferencing optional fields.";

  const diff = [
    `diff --git a/${primaryFile} b/${primaryFile}`,
    "index 0000000..1111111 100644",
    `--- a/${primaryFile}`,
    `+++ b/${primaryFile}`,
    "@@ -1,3 +1,8 @@",
    "+// TODO: apply targeted guard rails based on captured error trace",
    "+// 1) validate required fields before use",
    "+// 2) short-circuit with structured error response on invalid state",
    "+// 3) preserve existing safety gates and public interfaces"
  ].join("\n");

  return {
    mode: "patch",
    explanation,
    diff,
    traceExcerpt: errorLog.slice(0, 1200)
  };
}

function buildInternalMindTasksResponse(payload: InternalMindRequestBody): Record<string, unknown> {
  const issues = [
    ...(Array.isArray(payload?.issues) ? payload.issues : []),
    ...(Array.isArray(payload?.codexGaps) ? payload.codexGaps : [])
  ]
    .map((entry) => sanitizePromptText(String(entry || "")).trim())
    .filter(Boolean)
    .slice(0, 8);

  const taskSeeds = issues.length
    ? issues
    : [
        "No explicit issues supplied; generate a codex maintenance and observability task."
      ];

  const tasks = taskSeeds.map((issue, index) => ({
    type: index === 0 ? "feature" : "codex-update",
    summary: issue.length > 140 ? `${issue.slice(0, 137)}...` : issue,
    contextFiles: index === 0
      ? ["src/mind/evaluators/sessionEvaluator.ts", "src/mind/evaluators/improvementProposer.ts"]
      : ["codex/20-protocols.md"],
    acceptanceCriteria: index === 0
      ? [
          "Issue is translated into a concrete implementation step",
          "Result is traceable in codex decision history"
        ]
      : [
          "Protocol documentation updated for the identified gap",
          "Follow-up verification command is documented"
        ]
  }));

  return {
    mode: "tasks",
    tasks
  };
}

function getBackgroundReadinessStatus(env: Env): {
  ready: boolean;
  checks: Array<{ name: string; ok: boolean; detail: string }>;
} {
  const explicitEnv = String(env.ION_ENV || "").trim().toLowerCase();
  const isProduction = explicitEnv === "production";
  const adminKey = String(env.ION_ADMIN_KEY || "").trim();

  const checks = [
    {
      name: "env-set",
      ok: explicitEnv.length > 0,
      detail: explicitEnv.length > 0 ? `ION_ENV=${explicitEnv}` : "ION_ENV is not set"
    },
    {
      name: "admin-key",
      ok: !isProduction || adminKey.length >= 16,
      detail:
        !isProduction || adminKey.length >= 16
          ? "ION_ADMIN_KEY configured for production protected endpoints"
          : "ION_ADMIN_KEY missing or weak for production"
    },
    {
      name: "memory-kv",
      ok: Boolean(env.MEMORY),
      detail: env.MEMORY ? "MEMORY KV binding present" : "MEMORY KV binding missing"
    },
    {
      name: "mind-kv",
      ok: Boolean(env.MIND),
      detail: env.MIND ? "MIND KV binding present" : "MIND KV binding missing"
    },
    {
      name: "ai-binding",
      ok: Boolean(env.AI),
      detail: env.AI ? "AI binding present" : "AI binding missing"
    },
    {
      name: "assets-binding",
      ok: Boolean(env.ASSETS),
      detail: env.ASSETS ? "ASSETS binding present" : "ASSETS binding missing"
    }
  ];

  return {
    ready: checks.every((check) => check.ok),
    checks
  };
}

async function getReleaseSpecPayload(env: Env): Promise<Record<string, unknown>> {
  const release = {
    name: "Ionirix",
    version: "1.0.0",
    date: "2026-02-26",
    lineage: ["Ionirix"],
    recognitionCycle: "initiated"
  };

  let autonomyStatus: Record<string, unknown> | null = null;
  try {
    const status = await getMaintenanceStatus(env);
    autonomyStatus = {
      health: status.health,
      drift: status.drift,
      autonomy: status.autonomy,
      maintenance: status.maintenance
    };
  } catch {
    autonomyStatus = null;
  }

  const readiness = getBackgroundReadinessStatus(env);
  const readinessSnapshot = {
    ready: readiness.ready,
    failedChecks: readiness.checks
      .filter((check) => !check.ok)
      .map((check) => ({ name: check.name, detail: check.detail }))
  };

  return {
    release,
    capabilities: {
      identity: true,
      reasoning: true,
      memory: true,
      multimodal: true,
      behavior: true,
      autonomy: true,
      frontendMindState: true
    },
    endpoints: {
      ION: "/api/ION",
      image: "/api/image",
      providerStatus: "/api/provider/status",
      mindShardGenerate: "/api/mind/shards/generate",
      maintenanceStatus: "/api/maintenance/status",
      maintenanceRun: "/api/maintenance/run",
      releaseSpec: "/api/release/spec"
    },
    publicArtifacts: {
      declaration: "/ionirix-declaration.md",
      manifest: "/ionirix-release.json",
      specDoc: "/ION_AI_RELEASE_SPEC.md"
    },
    runtime: autonomyStatus
      ? {
          ...autonomyStatus,
          readiness: readinessSnapshot
        }
      : {
          readiness: readinessSnapshot
        }
  };
}

function sanitizePromptText(prompt: string): string {
  return String(prompt || "")
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Warmup connections on first request (non-blocking)
let connectionsWarmedUp = false;
let lastReadinessAuditAt = 0;
let lastReadinessSignature = "";
const READINESS_AUDIT_INTERVAL_MS = 5 * 60 * 1000;

function runBackgroundReadinessAudit(env: Env, logger: IONLogger): void {
  const now = Date.now();
  if (now - lastReadinessAuditAt < READINESS_AUDIT_INTERVAL_MS) {
    return;
  }

  lastReadinessAuditAt = now;

  const readiness = getBackgroundReadinessStatus(env);
  const failed = readiness.checks.filter((check) => !check.ok);
  const signature = readiness.ready
    ? "ready"
    : failed.map((check) => `${check.name}:${check.detail}`).join("|");

  if (signature === lastReadinessSignature && readiness.ready) {
    return;
  }

  lastReadinessSignature = signature;
  logger.log("release_readiness_background", {
    ready: readiness.ready,
    failedChecks: failed,
    checkedAt: now
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const logger = new IONLogger(env);

    // Warmup API connections on first request (non-blocking)
    if (!connectionsWarmedUp) {
      connectionsWarmedUp = true;
      warmupConnections(env).catch(() => {}); // Fire and forget
    }

    runBackgroundReadinessAudit(env, logger);

    try {
      const url = new URL(request.url);
      const isApiRoute =
        url.pathname === "/api/ION" ||
        url.pathname === "/api/chat/history" ||
        url.pathname === "/api/chat/settings" ||
        url.pathname === "/api/image" ||
        url.pathname === "/api/provider/status" ||
        url.pathname === "/api/ping" ||
        url.pathname === "/api/modes" ||
        url.pathname === "/api/modes/details" ||
        url.pathname.startsWith("/api/modes/") ||
        url.pathname === "/api/memory" ||
        url.pathname === "/api/internet/search" ||
        url.pathname === "/api/internet/learning" ||
        url.pathname === "/api/internet/weather" ||
        url.pathname === "/api/internet/inspect" ||
        url.pathname === "/api/human-verify" ||
        url.pathname === "/api/human-verify/config" ||
        url.pathname === "/api/human-verify/challenge" ||
        url.pathname === "/api/laws" ||
        url.pathname === "/api/search" ||
        url.pathname === "/api/preferences" ||
        url.pathname === "/api/stats" ||
        url.pathname === "/api/maintenance/run" ||
        url.pathname === "/api/maintenance/status" ||
        url.pathname === "/api/release/spec" ||
        url.pathname === "/api/mind/shards/generate" ||
        url.pathname === "/internal/mind";
        
      if (isApiRoute && request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS
        });
      }

      if (url.pathname === "/api/search" && request.method === "GET") {
        const query = String(url.searchParams.get("q") || "").trim();
        const limit = clamp(Number(url.searchParams.get("limit") || 4), 1, 10);

        if (!query) {
          return new Response(JSON.stringify({ query, hits: [] }), {
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          });
        }

        const hits = await searchKnowledge(env, request, query, limit);
        return new Response(JSON.stringify({ query, hits }), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
          }
        });
      }

      if (url.pathname === "/api/internet/search" && request.method === "GET") {
        const query = sanitizePromptText(String(url.searchParams.get("q") || "")).trim();
        const mode = sanitizePromptText(String(url.searchParams.get("mode") || "auto")).trim().toLowerCase();
        if (!query) {
          return new Response(
            JSON.stringify({ query, mode, hits: [] }),
            {
              headers: {
                ...CORS_HEADERS,
                "Content-Type": "application/json"
              }
            }
          );
        }

        const { profile, hits } = await performModeAwareInternetSearch(mode, query);
        await recordInternetLearning(env, mode, query, hits);
        return new Response(
          JSON.stringify({
            query,
            mode: normalizeInternetMode(mode),
            profile,
            count: hits.length,
            hits
          }),
          {
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          }
        );
      }

      if (url.pathname === "/api/internet/learning" && request.method === "GET") {
        const mode = sanitizePromptText(String(url.searchParams.get("mode") || "")).trim().toLowerCase();
        const query = sanitizePromptText(String(url.searchParams.get("q") || "")).trim();
        const store = await loadInternetLearningStore(env);
        const allEntries = Array.isArray(store.entries) ? store.entries : [];

        const filtered = allEntries.filter((entry) => {
          const modePass = mode ? entry.mode === normalizeInternetMode(mode) : true;
          const queryPass = query
            ? `${entry.query} ${entry.facts.map((fact) => `${fact.title} ${fact.snippet}`).join(" ")}`
                .toLowerCase()
                .includes(query.toLowerCase())
            : true;
          return modePass && queryPass;
        });

        return new Response(
          JSON.stringify({
            ok: true,
            updatedAt: store.updatedAt,
            count: filtered.length,
            entries: filtered.slice(0, 25)
          }),
          {
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          }
        );
      }

      if (url.pathname === "/api/internet/weather" && request.method === "GET") {
        const location = sanitizePromptText(String(url.searchParams.get("location") || "")).trim();
        const fallbackLocation = inferWeatherLocation(location || "weather", request);
        const weather = await fetchWeatherForLocation(location || fallbackLocation);

        if (!weather) {
          return new Response(
            JSON.stringify({ ok: false, error: "Weather lookup failed for the requested location." }),
            {
              status: 404,
              headers: {
                ...CORS_HEADERS,
                "Content-Type": "application/json"
              }
            }
          );
        }

        return new Response(
          JSON.stringify({
            ok: true,
            weather
          }),
          {
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          }
        );
      }

      if (url.pathname === "/api/internet/inspect" && request.method === "GET") {
        const target = sanitizePromptText(String(url.searchParams.get("url") || "")).trim();
        if (!target) {
          return new Response(JSON.stringify({ ok: false, error: "A url query parameter is required." }), {
            status: 400,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          });
        }

        const inspection = await inspectWebsite(target);
        if (!inspection) {
          return new Response(JSON.stringify({ ok: false, error: "Unable to inspect requested site." }), {
            status: 400,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          });
        }

        return new Response(
          JSON.stringify({
            ok: true,
            inspection
          }),
          {
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          }
        );
      }

      if (url.pathname === "/api/laws" && request.method === "GET") {
        const id = String(url.searchParams.get("id") || "").trim().toUpperCase();
        const tag = String(url.searchParams.get("tag") || "").trim().toLowerCase();
        const domainRaw = String(url.searchParams.get("domain") || "").trim().toLowerCase();

        const validDomain = domainRaw === "quantum" || domainRaw === "cognitive" || domainRaw === "physiological"
          ? (domainRaw as LawDomain)
          : null;

        const result = id
          ? Laws.getById(id)
            ? [Laws.getById(id)]
            : []
          : tag
            ? Laws.getByTag(tag)
            : validDomain
              ? Laws.getByDomain(validDomain)
              : Laws.listAll();

        return new Response(JSON.stringify({
          filters: {
            id: id || null,
            tag: tag || null,
            domain: validDomain || null
          },
          count: result.length,
          stats: Laws.stats(),
          laws: result
        }), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
          }
        });
      }

      if (url.pathname === "/api/human-verify/config" && request.method === "GET") {
        const siteKey = String(env.TURNSTILE_SITE_KEY || "").trim();
        const hasSecret = String(env.TURNSTILE_SECRET_KEY || "").trim().length > 0;
        return new Response(
          JSON.stringify({
            siteKey,
            turnstileEnabled: Boolean(siteKey && hasSecret),
            fallbackChallengeEnabled: Boolean(env.MEMORY),
            methods: [
              ...(siteKey && hasSecret ? ["turnstile"] : []),
              ...(env.MEMORY ? ["challenge"] : [])
            ]
          }),
          {
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          }
        );
      }

      if (url.pathname === "/api/human-verify/challenge" && request.method === "GET") {
        if (!env.MEMORY) {
          return new Response(
            JSON.stringify({ ok: false, error: "Fallback challenge is unavailable." }),
            {
              status: 503,
              headers: {
                ...CORS_HEADERS,
                "Content-Type": "application/json"
              }
            }
          );
        }

        const challenge = await createHumanChallenge(env);
        return new Response(
          JSON.stringify({
            ok: true,
            challenge
          }),
          {
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          }
        );
      }

      if (url.pathname === "/api/human-verify" && request.method === "POST") {
        const payload = (await request.json().catch(() => ({}))) as HumanVerifyRequestBody;
        const token = sanitizePromptText(String(payload?.token || "")).trim();
        const challengeId = sanitizePromptText(String(payload?.challengeId || "")).trim();
        const challengeAnswer = sanitizePromptText(String(payload?.challengeAnswer || "")).trim();
        const year = Number(payload?.birthDate?.year);
        const month = Number(payload?.birthDate?.month);
        const day = Number(payload?.birthDate?.day);

        const yearIsValid = Number.isFinite(year) && year >= 1900 && year <= 2200;
        const monthIsValid = Number.isFinite(month) && month >= 1 && month <= 12;
        const dayIsValid = Number.isFinite(day) && day >= 1 && day <= 31;
        if (!yearIsValid || !monthIsValid || !dayIsValid) {
          return new Response(JSON.stringify({ ok: false, error: "A valid birth date is required." }), {
            status: 400,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          });
        }

        const age = computeAgeFromBirthDate(year, month, day);
        if (!Number.isFinite(age) || age < 0) {
          return new Response(JSON.stringify({ ok: false, error: "Birth date is invalid for current time." }), {
            status: 400,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          });
        }

        const hasTurnstileSecret = String(env.TURNSTILE_SECRET_KEY || "").trim().length > 0;
        const hasTurnstileSiteKey = String(env.TURNSTILE_SITE_KEY || "").trim().length > 0;
        const turnstileEnabled = hasTurnstileSecret && hasTurnstileSiteKey;
        const challengeEnabled = Boolean(env.MEMORY);

        if (!turnstileEnabled && !challengeEnabled) {
          return new Response(JSON.stringify({ ok: false, error: "No verification method is configured on the server." }), {
            status: 503,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          });
        }

        let humanVerified = false;
        let verificationMethod = "none";

        if (turnstileEnabled && token) {
          humanVerified = await verifyTurnstileToken(request, env, token);
          if (humanVerified) {
            verificationMethod = "turnstile";
          }
        }

        if (!humanVerified && challengeEnabled && challengeId && challengeAnswer) {
          humanVerified = await verifyFallbackChallenge(env, challengeId, challengeAnswer);
          if (humanVerified) {
            verificationMethod = "challenge";
          }
        }

        if (!humanVerified) {
          return new Response(JSON.stringify({ ok: false, error: "Human verification failed. Complete Turnstile or solve the fallback challenge." }), {
            status: 403,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          });
        }

        const isAdult = age >= 18;
        return new Response(
          JSON.stringify({
            ok: true,
            humanVerified: true,
            verificationMethod,
            age,
            isAdult,
            ageTier: isAdult ? "adult" : "minor",
            adultAccess: isAdult,
            illegalContentBlocked: true
          }),
          {
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          }
        );
      }

      if (url.pathname === "/api/preferences" && request.method === "GET") {
        const memory = await getPreferences(env);
        return new Response(JSON.stringify(memory), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
          }
        });
      }

      if (url.pathname === "/api/ION/simulation/export" && request.method === "GET") {
        const sessionId = resolveSessionId(request);
        const payload = await exportSimulationState(env, { sessionId });
        const requestedSimulationId = sanitizePromptText(String(url.searchParams.get("simulationId") || "")).trim();
        if (requestedSimulationId && requestedSimulationId !== payload.simulationId) {
          return new Response(JSON.stringify({ ok: false, error: "Simulation not found for session." }), {
            status: 404,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          });
        }

        const downloadRequested = /^(1|true|yes)$/i.test(String(url.searchParams.get("download") || ""));
        const { exportUrl, downloadUrl } = buildSimulationExportUrls(request, sessionId);

        return new Response(JSON.stringify({ ok: true, ...payload, exportUrl, downloadUrl }), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json",
            "X-ION-Simulation-Id": payload.simulationId,
            "X-ION-Simulation-Status": payload.status,
            "X-ION-Simulation-Steps": String(payload.progress.stepsExecuted),
            "X-ION-Simulation-Target-Steps": String(payload.progress.targetSteps),
            "X-ION-Simulation-Progress": String(payload.progress.completionPercentage),
            "X-ION-Simulation-Export-Url": exportUrl,
            "X-ION-Simulation-Download-Url": downloadUrl,
            ...(downloadRequested ? { "Content-Disposition": `attachment; filename="${payload.fileName}"` } : {}),
            "Access-Control-Expose-Headers": [
              "X-ION-Simulation-Id",
              "X-ION-Simulation-Status",
              "X-ION-Simulation-Steps",
              "X-ION-Simulation-Target-Steps",
              "X-ION-Simulation-Progress",
              "X-ION-Simulation-Export-Url",
              "X-ION-Simulation-Download-Url"
            ].join(", ")
          }
        });
      }

      if (url.pathname === "/api/ION/simulation/control" && request.method === "POST") {
        const sessionId = resolveSessionId(request);
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const command = String(body?.command || "/simulation start").trim().slice(0, 1600);
        const rules = sanitizePromptText(String(body?.rules || "")).trim();
        const content = rules ? `${command}\nrules:\n${rules}` : command;

        const simulationContext = await advanceSimulationState(
          env,
          [{ role: "user", content }],
          { sessionId }
        );

        const { exportUrl, downloadUrl } = buildSimulationExportUrls(request, sessionId);

        return new Response(
          JSON.stringify({
            ok: true,
            state: simulationContext.state,
            logsSummary: simulationContext.logsSummary,
            statusSummary: simulationContext.statusSummary,
            chatSummary: simulationContext.chatSummary,
            export: {
              ...simulationContext.exportPayload,
              exportUrl,
              downloadUrl
            }
          }),
          {
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json",
              "X-ION-Simulation-Id": simulationContext.state.simulationId,
              "X-ION-Simulation-Status": simulationContext.state.status,
              "X-ION-Simulation-Steps": String(simulationContext.state.stepsExecuted),
              "X-ION-Simulation-Target-Steps": String(simulationContext.state.targetSteps),
              "X-ION-Simulation-Progress": String(simulationContext.state.completionPercentage),
              "X-ION-Simulation-Export-Url": exportUrl,
              "X-ION-Simulation-Download-Url": downloadUrl,
              "Access-Control-Expose-Headers": [
                "X-ION-Simulation-Id",
                "X-ION-Simulation-Status",
                "X-ION-Simulation-Steps",
                "X-ION-Simulation-Target-Steps",
                "X-ION-Simulation-Progress",
                "X-ION-Simulation-Export-Url",
                "X-ION-Simulation-Download-Url"
              ].join(", ")
            }
          }
        );
      }

      if (url.pathname === "/api/ping" && request.method === "GET") {
        return withCors(await apiPing());
      }

      if (url.pathname === "/api/provider/status" && request.method === "GET") {
        return new Response(JSON.stringify(getProviderStatusSnapshot(env)), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
          }
        });
      }

      if (url.pathname === "/api/modes" && request.method === "GET") {
        const includeDetails = String(url.searchParams.get("details") || "").toLowerCase() === "true";
        return withCors(includeDetails ? await listModeDetails() : await listModes());
      }

      if (url.pathname === "/api/modes/details" && request.method === "GET") {
        return withCors(await listModeDetails());
      }

      if (url.pathname.startsWith("/api/modes/") && request.method === "GET") {
        const modeId = sanitizePromptText(url.pathname.slice("/api/modes/".length)).trim().toLowerCase();
        return withCors(await getModeDetails(modeId));
      }

      if (url.pathname === "/api/memory" && request.method === "GET") {
        const key = sanitizePromptText(String(url.searchParams.get("key") || "memory"));
        return withCors(await getMemoryApi(env, key));
      }

      if (url.pathname === "/api/memory" && request.method === "POST") {
        const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const key = sanitizePromptText(String(payload?.key || "memory"));
        const merge = payload?.merge === true;
        const value = Object.prototype.hasOwnProperty.call(payload, "value") ? payload.value : payload;
        return withCors(await setMemoryApi(env, value, key, { merge }));
      }

      if (url.pathname === "/api/memory" && request.method === "DELETE") {
        const key = sanitizePromptText(String(url.searchParams.get("key") || "memory"));
        return withCors(await deleteMemoryApi(env, key));
      }

      if (url.pathname === "/api/stats" && request.method === "GET") {
        const stats = getConnectionStats();
        return new Response(JSON.stringify(stats), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
          }
        });
      }

      if (url.pathname === "/api/maintenance/status" && request.method === "GET") {
        if (!isAdminAuthorized(request, env)) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          });
        }

        const status = await getMaintenanceStatus(env);
        return new Response(JSON.stringify(status), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
          }
        });
      }

      if (url.pathname === "/api/release/spec" && request.method === "GET") {
        const spec = await getReleaseSpecPayload(env);
        return new Response(JSON.stringify(spec), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
          }
        });
      }

      if (url.pathname === "/api/maintenance/run" && request.method === "POST") {
        if (!isAdminAuthorized(request, env)) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          });
        }

        const report = await runSelfMaintenance(env);
        logger.log("manual_self_maintenance_complete", report);

        return new Response(JSON.stringify({ ok: true, report }), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
          }
        });
      }

      if (url.pathname === "/api/mind/shards/generate" && request.method === "POST") {
        const body = (await request.json().catch(() => null)) as GenerateTaskShardRequestBody | null;
        if (!body) {
          return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
            status: 400,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          });
        }

        const title = sanitizePromptText(String(body.title || "")).trim();
        const summary = sanitizePromptText(String(body.summary || "")).trim();
        const department = parseDepartment(body.department);
        const priority = parsePriority(body.priority) || "normal";
        const legacyWeight = Number(body.legacy_weight);
        const createdBy = sanitizePromptText(String(body.created_by || "agent.conductor.blackwell")).trim() || "agent.conductor.blackwell";
        const decayAt = sanitizePromptText(String(body.decay_at || "")).trim() || undefined;

        if (!title || !summary || !department) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: "Missing or invalid fields. Required: title, summary, department(Research|Ops|Finance|Creative|Infra)."
            }),
            {
              status: 400,
              headers: {
                ...CORS_HEADERS,
                "Content-Type": "application/json"
              }
            }
          );
        }

        const profiles = parseBlackwellProfilesFromConfig();
        const result = generateTaskShards(
          {
            title,
            summary,
            department,
            priority,
            input_payload: body.input_payload ?? {},
            legacy_weight: Number.isFinite(legacyWeight) ? legacyWeight : undefined,
            decay_at: decayAt,
            created_by: createdBy
          },
          profiles
        );

        return new Response(
          JSON.stringify({
            ok: true,
            ticket: result.ticket,
            shards: result.shards,
            assignmentPlan: result.assignmentPlan,
            profileCount: profiles.length
          }),
          {
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          }
        );
      }

      if (url.pathname === "/internal/mind" && request.method === "POST") {
        if (!isAdminAuthorized(request, env)) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          });
        }

        const body = (await request.json().catch(() => ({}))) as InternalMindRequestBody;
        const mode = resolveInternalMindMode(String(body?.mode || ""));
        if (!mode) {
          return new Response(
            JSON.stringify({
              error: "Invalid mode. Expected one of: improvement, patch, tasks."
            }),
            {
              status: 400,
              headers: {
                ...CORS_HEADERS,
                "Content-Type": "application/json"
              }
            }
          );
        }

        const payload =
          mode === "improvement"
            ? buildInternalMindImprovementResponse(body)
            : mode === "patch"
              ? buildInternalMindPatchResponse(body)
              : buildInternalMindTasksResponse(body);

        return new Response(JSON.stringify(payload), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
          }
        });
      }

      if (url.pathname === "/api/preferences" && request.method === "POST") {
        const payload = await request.json();
        const memory = await savePreferences(env, payload || {});
        return new Response(JSON.stringify(memory), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
          }
        });
      }

      if (url.pathname === "/api/preferences" && request.method === "DELETE") {
        await resetPreferences(env);
        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
          }
        });
      }

      if (url.pathname === "/api/ION" && request.method !== "POST") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "POST, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/image" && !["GET", "POST"].includes(request.method)) {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "GET, POST, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/ping" && request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "GET, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/provider/status" && request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "GET, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/modes" && request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "GET, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/modes/details" && request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "GET, OPTIONS"
          }
        });
      }

      if (url.pathname.startsWith("/api/modes/") && request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "GET, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/memory" && !["GET", "POST", "DELETE"].includes(request.method)) {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "GET, POST, DELETE, OPTIONS"
          }
        });
      }

      if (url.pathname === "/internal/mind" && request.method !== "POST") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "POST, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/mind/shards/generate" && request.method !== "POST") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "POST, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/laws" && request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "GET, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/internet/search" && request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "GET, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/internet/learning" && request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "GET, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/internet/weather" && request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "GET, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/internet/inspect" && request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "GET, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/human-verify/config" && request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "GET, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/human-verify/challenge" && request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "GET, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/human-verify" && request.method !== "POST") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "POST, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/maintenance/status" && request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "GET, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/maintenance/run" && request.method !== "POST") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "POST, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/release/spec" && request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            ...CORS_HEADERS,
            "Allow": "GET, OPTIONS"
          }
        });
      }

      if (url.pathname === "/api/image" && request.method === "GET") {
        const imageQueueV1Requested = String(url.searchParams.get("queue") || "").toLowerCase() === "v1";
        const imageQueueV1Enabled = isEnabledFlag(env.ION_IMAGE_QUEUE_V1) || imageQueueV1Requested;

        if (!imageQueueV1Enabled) {
          return new Response("Method Not Allowed", {
            status: 405,
            headers: {
              ...CORS_HEADERS,
              "Allow": "POST, OPTIONS"
            }
          });
        }

        const jobId = sanitizePromptText(String(url.searchParams.get("jobId") || ""));
        const statusResult = await getIonImageQueueStatusRouteResult(jobId, env as unknown as Record<string, unknown>);

        return new Response(JSON.stringify(statusResult.body), {
          status: statusResult.status,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
          }
        });
      }

      if (url.pathname === "/api/image" && request.method === "POST") {
        try {
          const body = (await request.json()) as ImageRequestBody;
          const safetyProfile = normalizeSafetyProfile(body?.safetyProfile);
          const legalDecision = evaluateLegalAttestation(safetyProfile, request);
          if (legalDecision.blocked) {
            return new Response(
              JSON.stringify({
                error: legalDecision.error,
                code: legalDecision.code
              }),
              {
                status: 403,
                headers: {
                  ...CORS_HEADERS,
                  "Content-Type": "application/json"
                }
              }
            );
          }
          const userId = sanitizePromptText(String(body?.userId || "anonymous"));
          const promptText = sanitizePromptText(String(body?.prompt || ""));
          const feedback = sanitizePromptText(String(body?.feedback || ""));
          const requestedStylePack = sanitizePromptText(String(body?.stylePack || "")).toLowerCase();
          const requestedLaws = Array.isArray(body?.laws)
            ? body.laws
                .map((law) => {
                  const id = sanitizePromptText(String(law?.id || "")).toUpperCase();
                  const mode = sanitizePromptText(String(law?.mode || "")).toLowerCase();
                  const weight = Number(law?.weight);
                  const normalizedMode: LawReference["mode"] =
                    mode === "symbolic" || mode === "structural" || mode === "color" || mode === "motion"
                      ? mode
                      : undefined;
                  return {
                    id,
                    mode: normalizedMode,
                    weight: Number.isFinite(weight) ? Math.min(1, Math.max(0, weight)) : undefined
                  };
                })
                .filter((law) => Boolean(law.id))
            : [];
          const requestedQuality = sanitizePromptText(String(body?.quality || "")).toLowerCase();
          const effectiveQuality = requestedQuality || ION_IMAGE_DEFAULT_QUALITY;
          const requestedMode = sanitizePromptText(String(body?.mode || "simple")).toLowerCase() || "simple";
          const promptInferredStyle = resolveStyleName(inferLegacyStyleFromPrompt(promptText));
          const promptInferredCamera = inferLegacyCameraFromPrompt(promptText);
          const promptInferredLighting = inferLegacyLightingFromPrompt(promptText);
          const promptInferredMaterials = inferLegacyMaterialsFromPrompt(promptText);
          const effectiveStylePack = promptInferredStyle || requestedStylePack;
          const resolvedRenderingStyle = resolveStyleName(effectiveStylePack) || "auto";
          const requestedCameraRaw = sanitizePromptText(String(body?.camera || "")).toLowerCase();
          const requestedLightingRaw = sanitizePromptText(String(body?.lighting || "")).toLowerCase();
          const requestedMaterials = Array.isArray(body?.materials)
            ? body.materials.map((item) => sanitizePromptText(String(item || "")).toLowerCase()).filter(Boolean)
            : [];
          const effectiveCamera = promptInferredCamera || requestedCameraRaw;
          const effectiveLighting = promptInferredLighting || requestedLightingRaw;
          const effectiveMaterials = promptInferredMaterials.length
            ? promptInferredMaterials
            : requestedMaterials.length
              ? requestedMaterials
              : [];
          const requestedRatio = sanitizePromptText(String(body?.ratio || ""));
          const requestedResolution = sanitizePromptText(String(body?.resolution || ""));
          const requestedWidth = Number(body?.width);
          const requestedHeight = Number(body?.height);
          const effectiveRatio = requestedRatio || ION_IMAGE_DEFAULT_RATIO;
          const effectiveResolution = requestedResolution || ION_IMAGE_DEFAULT_RESOLUTION;
          const effectiveWidth = Number.isFinite(requestedWidth) ? requestedWidth : ION_IMAGE_DEFAULT_WIDTH;
          const effectiveHeight = Number.isFinite(requestedHeight) ? requestedHeight : ION_IMAGE_DEFAULT_HEIGHT;
          const parsedSeed = Number(body?.seed);
          const imageQueueV1Requested = String(url.searchParams.get("queue") || "").toLowerCase() === "v1";
          const imageQueueV1Enabled = isEnabledFlag(env.ION_IMAGE_QUEUE_V1) || imageQueueV1Requested;
          const imagePipelineV2Requested = String(url.searchParams.get("pipeline") || "").toLowerCase() === "v2";
          const imagePipelineV2FlagEnabled = isEnabledFlag(env.ION_IMAGE_PIPELINE_V2);
          const imagePipelineV2Enabled = imagePipelineV2FlagEnabled || imagePipelineV2Requested;
          const debugRequested =
            body?.debug === true ||
            String(url.searchParams.get("debug") || "").toLowerCase() === "true";

          if (!promptText) {
            return new Response(JSON.stringify({ error: "Prompt is required" }), {
              status: 400,
              headers: {
                ...CORS_HEADERS,
                "Content-Type": "application/json"
              }
            });
          }

          if (promptText.length > ION_IMAGE_PROMPT_MAX_CHARS) {
            return new Response(
              JSON.stringify({
                error: `Prompt is too long for image generation. Please keep it under ${ION_IMAGE_PROMPT_MAX_CHARS} characters.`,
                code: "prompt-too-long"
              }),
              {
                status: 400,
                headers: {
                  ...CORS_HEADERS,
                  "Content-Type": "application/json"
                }
              }
            );
          }

          // Bootstrap safe.tensor governance BEFORE using ION pipeline
          // This enables the full ION image generation capabilities
          try {
            bootstrapSafeTensorGovernance();
          } catch (bootstrapErr) {
            logger.log("safe_tensor_bootstrap_notice", {
              message: String((bootstrapErr as any)?.message || "Bootstrap issued notice"),
              willContinueWithIONPipeline: true
            });
          }

          const safetyDecision = evaluateSexualSafetyPrompt(promptText, safetyProfile);
          if (safetyDecision.blocked) {
            return new Response(
              JSON.stringify({
                error:
                  safetyDecision.reason === "illegal-content-blocked"
                    ? "Illegal sexual content is blocked for all access tiers."
                    : "Explicit sexual content is age-restricted and unavailable for this profile.",
                code: safetyDecision.reason
              }),
              {
                status: 403,
                headers: {
                  ...CORS_HEADERS,
                  "Content-Type": "application/json"
                }
              }
            );
          }

          if (imageQueueV1Requested && imageQueueV1Enabled) {
            const queueRouteResult = await submitIonImageQueueRouteResult(
              {
                userId,
                prompt: promptText,
                stylePack: effectiveStylePack || requestedStylePack,
                width: effectiveWidth,
                height: effectiveHeight,
                seed: Number.isFinite(parsedSeed) ? parsedSeed : undefined
              },
              env as unknown as Record<string, unknown>
            );

            ctx.waitUntil(queueRouteResult.backgroundTask);

            return new Response(JSON.stringify(queueRouteResult.response.body), {
              status: queueRouteResult.response.status,
              headers: {
                ...CORS_HEADERS,
                "Content-Type": "application/json"
              }
            });
          }

          if (imagePipelineV2Enabled) {
            try {
              const imagePipelineStartedAt = Date.now();
              
              // Log pipeline startup details
              logger.log("ion_image_pipeline_start", {
                userId,
                promptLength: promptText.length,
                stylePackRequested: effectiveStylePack || requestedStylePack,
                dimensions: `${effectiveWidth}x${effectiveHeight}`
              });
              
              const pipelineResult = await executeIonImagePipeline(
                {
                  userId,
                  prompt: promptText,
                  stylePack: effectiveStylePack || requestedStylePack,
                  width: effectiveWidth,
                  height: effectiveHeight,
                  seed: Number.isFinite(parsedSeed) ? parsedSeed : undefined
                },
                env as unknown as Record<string, unknown>
              );

              const totalMs = Date.now() - imagePipelineStartedAt;
              logger.log("ion_image_pipeline_success", {
                userId,
                totalMs,
                gatewayKind: pipelineResult.gatewayKind
              });
              const renderingStyleSource = effectiveStylePack ? "session-or-request" : "auto";
              const cameraSource = promptInferredCamera ? "prompt" : (requestedCameraRaw ? "session-or-request" : "none");
              const lightingSource = promptInferredLighting ? "prompt" : (requestedLightingRaw ? "session-or-request" : "none");
              const materialsSource = promptInferredMaterials.length ? "prompt" : (requestedMaterials.length ? "session-or-request" : "none");
              const responsePayload = await buildIonImageV2RouteResult({
                userId,
                mode: requestedMode,
                quality: effectiveQuality,
                ratio: effectiveRatio,
                feedbackApplied: Boolean(feedback),
                styleSource: renderingStyleSource,
                camera: {
                  value: effectiveCamera,
                  source: cameraSource
                },
                lighting: {
                  value: effectiveLighting,
                  source: lightingSource
                },
                materials: {
                  values: effectiveMaterials,
                  source: materialsSource
                },
                safety: {
                  ageTier: safetyProfile.ageTier,
                  explicitAllowed: safetyProfile.explicitAllowed,
                  illegalBlocked: safetyProfile.illegalBlocked
                },
                pipelineResult,
                debugRequested: debugRequested
                  ? {
                    mode: requestedMode,
                    stylePack: requestedStylePack,
                    inferredStyleFromPrompt: promptInferredStyle || null,
                    effectiveStylePack: effectiveStylePack || null,
                    quality: effectiveQuality,
                    renderingStyle: pipelineResult.request.ionMetadata.styleFamily,
                    inferredCameraFromPrompt: promptInferredCamera || null,
                    effectiveCamera,
                    inferredLightingFromPrompt: promptInferredLighting || null,
                    effectiveLighting,
                    inferredMaterialsFromPrompt: promptInferredMaterials,
                    effectiveMaterials,
                    availableStyles: listAvailableStyles(),
                    ratio: requestedRatio,
                    resolution: requestedResolution || null,
                    width: Number.isFinite(requestedWidth) ? requestedWidth : null,
                    height: Number.isFinite(requestedHeight) ? requestedHeight : null,
                    seed: Number.isFinite(parsedSeed) ? parsedSeed : null
                  }
                  : undefined,
                totalMs,
              });

              return new Response(
                JSON.stringify(responsePayload.body),
                {
                  headers: {
                    ...CORS_HEADERS,
                    ...responsePayload.headers,
                  }
                }
              );
            } catch (pipelineErr: any) {
              const errorMessage = String((pipelineErr as any)?.message || pipelineErr || "Unknown error");
              const errorName = String((pipelineErr as any)?.name || "Error");
              
              logger.log("ion_image_pipeline_error", {
                userId,
                errorName,
                errorMessage,
                isComfyPromptDenied: isComfyPromptAccessDeniedError(pipelineErr),
                willFallback:
                  isComfyPromptAccessDeniedError(pipelineErr) &&
                  shouldUseDirectFallbackOnPrompt403(env) &&
                  env.AI &&
                  typeof (env.AI as { run?: unknown }).run === "function"
              });
              
              if (
                isComfyPromptAccessDeniedError(pipelineErr) &&
                shouldUseDirectFallbackOnPrompt403(env) &&
                env.AI &&
                typeof (env.AI as { run?: unknown }).run === "function"
              ) {
                logger.log("ion_image_pipeline_fallback_triggered", {
                  userId,
                  reason: "ComfyUI access denied - using SDXL fallback"
                });
                
                return buildDirectAiImageFallbackResponse({
                  env,
                  userId,
                  promptText,
                  requestedMode,
                  effectiveQuality,
                  effectiveRatio,
                  effectiveWidth,
                  effectiveHeight,
                  parsedSeed,
                  resolvedRenderingStyle,
                  effectiveStylePack,
                  feedback,
                  effectiveCamera,
                  effectiveLighting,
                  effectiveMaterials,
                  promptInferredCamera,
                  promptInferredLighting,
                  promptInferredMaterials,
                  requestedCameraRaw,
                  requestedLightingRaw,
                  requestedMaterials,
                  safetyProfile,
                });
              }
              throw pipelineErr;
            }
          }

          if (!imagePipelineV2Enabled) {
            return new Response(
              JSON.stringify({
                error: "ION image pipeline v2 is required.",
                code: "image-gen-v2-required"
              }),
              {
                status: 503,
                headers: {
                  ...CORS_HEADERS,
                  "Content-Type": "application/json"
                }
              }
            );
          }
        } catch (imageErr: any) {
          logger.error("image_generation_error", imageErr);
          const normalizedError = normalizeLegacyImageGenerationError(imageErr);
          return new Response(JSON.stringify({
            error: normalizedError.message,
            code: normalizedError.code,
            details: normalizedError.details
          }), {
            status: normalizedError.status,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          });
        }
      }

      if (url.pathname === "/api/chat/history" && (request.method === "GET" || request.method === "POST")) {
        await ensureIONMemorySchema(env);
        const authChatContext = await resolveAuthenticatedChatContext(request, env);
        if (!authChatContext?.userId) {
          return new Response(JSON.stringify({ error: "Authentication required." }), {
            status: 401,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          });
        }

        const requestBody = request.method === "POST"
          ? await request.json().catch(() => ({})) as { limit?: number }
          : {} as { limit?: number };
        const limitFromQuery = Number(url.searchParams.get("limit"));
        const limitFromBody = Number(requestBody.limit);
        const limit = Number.isFinite(limitFromBody)
          ? limitFromBody
          : Number.isFinite(limitFromQuery)
            ? limitFromQuery
            : 120;
        const turns = await getChatHistoryForUser(env, authChatContext.userId, limit);
        const preferences = await getChatPreferences(env, authChatContext.userId);

        return new Response(JSON.stringify({ turns, preferences }), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
          }
        });
      }

      if (url.pathname === "/api/chat/history" && request.method === "DELETE") {
        await ensureIONMemorySchema(env);
        const authChatContext = await resolveAuthenticatedChatContext(request, env);
        if (!authChatContext?.userId) {
          return new Response(JSON.stringify({ error: "Authentication required." }), {
            status: 401,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          });
        }

        const deletedCount = await clearChatHistoryForUser(env, authChatContext.userId);
        return new Response(JSON.stringify({ ok: true, deletedCount }), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
          }
        });
      }

      if (url.pathname === "/api/chat/settings" && request.method === "GET") {
        await ensureIONMemorySchema(env);
        const authChatContext = await resolveAuthenticatedChatContext(request, env);
        if (!authChatContext?.userId) {
          return new Response(JSON.stringify({ error: "Authentication required." }), {
            status: 401,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          });
        }

        const preferences = await getChatPreferences(env, authChatContext.userId);
        return new Response(JSON.stringify({ ok: true, preferences }), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
          }
        });
      }

      if (url.pathname === "/api/chat/settings" && request.method === "PUT") {
        await ensureIONMemorySchema(env);
        const authChatContext = await resolveAuthenticatedChatContext(request, env);
        if (!authChatContext?.userId) {
          return new Response(JSON.stringify({ error: "Authentication required." }), {
            status: 401,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json"
            }
          });
        }

        const body = (await request.json().catch(() => ({}))) as {
          persistHistory?: boolean;
          contextCarryover?: boolean;
        };
        const preferences = await updateChatPreferences(env, authChatContext.userId, {
          persistHistory: typeof body.persistHistory === "boolean" ? body.persistHistory : undefined,
          contextCarryover: typeof body.contextCarryover === "boolean" ? body.contextCarryover : undefined
        });

        return new Response(JSON.stringify({ ok: true, preferences }), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
          }
        });
      }

      if (url.pathname === "/api/ION" && request.method === "POST") {
        const requestStartedAt = Date.now();
        await ensureIONMemorySchema(env);
        const body = (await request.json()) as IONRequestBody;
        const authChatContext = await resolveAuthenticatedChatContext(request, env);
        const sessionId = authChatContext?.sessionId || resolveSessionId(request);
        const userId = authChatContext?.userId || "";
        const chatPreferences = userId ? await getChatPreferences(env, userId) : null;
        const safetyProfile = normalizeSafetyProfile(body?.safetyProfile);
        const legalDecision = evaluateLegalAttestation(safetyProfile, request);
        if (legalDecision.blocked) {
          return new Response(
            JSON.stringify({
              error: legalDecision.error,
              code: legalDecision.code
            }),
            {
              status: 403,
              headers: {
                ...CORS_HEADERS,
                "Content-Type": "application/json"
              }
            }
          );
        }

        if (!body.messages || !IONSafety.validateMessages(body.messages)) {
          logger.error("invalid_messages", body);
          return new Response("Invalid message format", { status: 400 });
        }

        const requestedMode = canonicalizeIONMode(String(body.mode || "auto"));
        const sanitizedMessages = (body.messages || []).map((m) => ({
          role: (m?.role || "user") as IONRole,
          content: IONSafety.sanitizeInput(m?.content || "")
        }));
        const latestUserText = getLatestUserText(sanitizedMessages);
        const workingMemory = await loadWorkingMemory(env, sessionId);
        const conversationHints = normalizeConversationHints(body?.conversationHints);
        const normalizedMode = resolveEffectiveIONMode({
          requestedMode,
          latestUserText,
          conversationHints,
          lastMode: workingMemory.lastMode
        });
        const requestCtx = {
          mode: normalizedMode,
          model: "ION",
          messages: sanitizedMessages
        };

        const isStatefulSimulationMode = normalizedMode === "simulation" || normalizedMode === "cosmic" || normalizedMode === "multiverse";

        const engineSimulationContext = normalizedMode === "simulation"
          ? await advanceSimulationState(env, requestCtx.messages, { sessionId })
          : null;
        const cosmicSimulationContext = normalizedMode === "cosmic"
          ? buildCosmicSimulationContext(requestCtx.messages)
          : null;
        const multiverseSimulationContext = normalizedMode === "multiverse"
          ? await buildMultiverseSimulationContext(requestCtx.messages)
          : null;
        const simulationContext = engineSimulationContext || cosmicSimulationContext || multiverseSimulationContext;
        const requestCountryCode = getRequestCountryCode(request);
        const freshnessSensitiveQuery = isFreshnessSensitiveQuery(latestUserText);
        const fastChatEnabled =
          isEnabledFlag(env.ION_FAST_CHAT) ||
          body?.fastMode === true ||
          String(url.searchParams.get("fast") || "").toLowerCase() === "true";
        const nativeStreamingEnabled = isEnabledFlag(env.ION_NATIVE_STREAMING) || fastChatEnabled;

        const conversationDigest = buildConversationDigest(requestCtx.messages, 6);
        const safetyDecision = evaluateSexualSafetyPrompt(latestUserText, safetyProfile);
        if (safetyDecision.blocked) {
          return new Response(
            JSON.stringify({
              error:
                safetyDecision.reason === "illegal-content-blocked"
                  ? "Illegal sexual content is blocked for all users."
                  : "Explicit sexual content is age-restricted for this profile.",
              code: safetyDecision.reason
            }),
            {
              status: 403,
              headers: {
                ...CORS_HEADERS,
                "Content-Type": "application/json"
              }
            }
          );
        }

        const personaProfilePromise = resolvePersonaProfile(env, normalizedMode);
        const emotionalResonancePromise = getEmotionalResonance(
          env,
          sessionId,
          latestUserText,
          workingMemory.emotionalTone
        );
        const orchestratorDecision = decideMultimodalRoute({
          latestUserText,
          mode: normalizedMode
        });
        const routeSelection = chooseModelForTask("auto", latestUserText, normalizedMode);

        const promptSystemMessages: IONMessage[] = [];
        let internetProfileUsed: InternetSearchProfile | null = null;
        let internetHitCount = 0;
        let responseSources: ChatSourceReference[] = [];
        const savedMemory = isStatefulSimulationMode ? {} : await getPreferences(env);
        const personaProfile = await personaProfilePromise;
        const emotionalResonance = await emotionalResonancePromise;
        if (!isStatefulSimulationMode && savedMemory && Object.keys(savedMemory).length > 0) {
          promptSystemMessages.push(
            makeContextSystemMessage("User Memory", JSON.stringify(savedMemory, null, 2))
          );
        }

        if (simulationContext) {
          promptSystemMessages.push(
            makeContextSystemMessage("Simulation Engine", simulationContext.systemPrompt)
          );
          promptSystemMessages.push(
            makeContextSystemMessage("Simulation Status", simulationContext.statusSummary)
          );
          promptSystemMessages.push(
            makeContextSystemMessage("Simulation Log", simulationContext.logsSummary)
          );
          promptSystemMessages.push(
            makeContextSystemMessage("Simulation Report", simulationContext.chatSummary)
          );
        }

        promptSystemMessages.push(
          makeContextSystemMessage("Persona Engine", buildPersonaPrompt(personaProfile))
        );
        promptSystemMessages.push(
          makeContextSystemMessage(
            "Safety Profile",
            JSON.stringify(
              {
                ageTier: safetyProfile.ageTier,
                explicitAllowed: safetyProfile.explicitAllowed,
                illegalBlocked: safetyProfile.illegalBlocked,
                legalAttestation: {
                  accepted: safetyProfile.legalAttestation.accepted,
                  jurisdiction: safetyProfile.legalAttestation.jurisdiction,
                  truthfulIdentity: safetyProfile.legalAttestation.truthfulIdentity,
                  lawfulUse: safetyProfile.legalAttestation.lawfulUse,
                  userDirected: safetyProfile.legalAttestation.userDirected
                },
                requestCountryCode,
                enforcement: "illegal content is always blocked"
              },
              null,
              2
            )
          )
        );
        promptSystemMessages.push(
          makeContextSystemMessage("Emotional Resonance", buildEmotionalResonancePrompt(emotionalResonance))
        );
        promptSystemMessages.push(
          makeContextSystemMessage(
            "Adaptive Behavior",
            buildAdaptiveBehaviorPrompt({
              mode: normalizedMode,
              userEmotion: emotionalResonance.userEmotion,
              IONTone: emotionalResonance.IONTone,
              route: orchestratorDecision.route
            })
          )
        );
        promptSystemMessages.push(
          makeContextSystemMessage(
            "Reasoning Planner",
            buildReasoningPlannerPrompt({
              mode: normalizedMode,
              latestUserText,
              conversationDigest,
              conversationHints
            })
          )
        );
        promptSystemMessages.push(
          makeContextSystemMessage(
            "Response Flexibility",
            buildFlexibleResponsePrompt({
              latestUserText,
              requestedOutput: conversationHints.requestedOutput,
              route: orchestratorDecision.route,
              mode: normalizedMode
            })
          )
        );

        const allowInternetLookupInFastMode = shouldUseInternetSearch(latestUserText, normalizedMode);
        const shouldLoadMemoryArc = !isStatefulSimulationMode && !fastChatEnabled && chatPreferences?.contextCarryover !== false;
        const shouldLoadInternetLearning = !fastChatEnabled && !freshnessSensitiveQuery;
        const shouldLoadWeather = shouldUseWeatherContext(latestUserText);
        const weatherLocation = shouldLoadWeather ? inferWeatherLocation(latestUserText, request) : "";
        const shouldUseKnowledge = !fastChatEnabled && shouldUseKnowledgeRetrieval(latestUserText, normalizedMode);
        const shouldLoadSystemModules = !fastChatEnabled && shouldUseSystemKnowledge(normalizedMode, latestUserText);
        const shouldLoadInternetSearch = (allowInternetLookupInFastMode || !fastChatEnabled) && shouldUseInternetSearch(latestUserText, normalizedMode);

        const memoryArcPromise = shouldLoadMemoryArc
          ? userId
            ? getRecentMemoryArcForUser(env, userId, 6)
            : getRecentMemoryArc(env, sessionId, 3)
          : Promise.resolve([]);
        const internetLearningPromise = shouldLoadInternetLearning
          ? getInternetLearningContext(env, normalizedMode, latestUserText, 4)
          : Promise.resolve("");
        const weatherPromise = shouldLoadWeather
          ? fetchWeatherForLocation(weatherLocation)
          : Promise.resolve(null);
        const knowledgePromise = shouldUseKnowledge
          ? searchKnowledge(env, request, latestUserText, 4)
          : Promise.resolve([]);
        const modulePromise = shouldLoadSystemModules
          ? searchModules(env, request, latestUserText || "system modules", 3)
          : Promise.resolve([]);
        const internetSearchPromise = shouldLoadInternetSearch
          ? performModeAwareInternetSearch(normalizedMode, latestUserText)
          : Promise.resolve(null);

        if (!isStatefulSimulationMode) {
          const workingMemoryPrompt = formatWorkingMemoryPrompt(workingMemory);
          if (workingMemoryPrompt) {
            promptSystemMessages.push(
              makeContextSystemMessage("Working Memory", workingMemoryPrompt)
            );
          }

          const memoryArc = await memoryArcPromise;
          if (memoryArc.length) {
            const arcPrompt = memoryArc
              .map((entry, index) => {
                return `(${index + 1}) [${entry.mode}] USER: ${entry.userText}\nION: ${entry.assistantText}`;
              })
              .join("\n\n");

            promptSystemMessages.push(
              makeContextSystemMessage("Long-Term Memory Arc", arcPrompt)
            );
          }
        }

        const modeTemplate = buildModeTemplate({
          mode: normalizedMode,
          latestUserText
        });

        if (modeTemplate) {
          promptSystemMessages.push(makeContextSystemMessage("Mode Template", modeTemplate));
        }

        const internetLearningContext = await withTimeout(internetLearningPromise, 250, "");
        if (internetLearningContext) {
          promptSystemMessages.push(
            makeContextSystemMessage(
              "Internet Learning Memory",
              [
                "The following learned internet findings were collected from prior searches.",
                "Use them as supplemental context and prefer fresher direct retrieval when conflicts appear.",
                "",
                internetLearningContext
              ].join("\n")
            )
          );
        }

        if (shouldLoadWeather) {
          const weather = await withTimeout(weatherPromise, 800, null);
          if (weather) {
            responseSources = dedupeChatSources([
              ...responseSources,
              ...buildWeatherSourceReference(weather)
            ]);
            promptSystemMessages.push(
              makeContextSystemMessage(
                "Live Weather",
                [
                  `Location: ${weather.location}`,
                  `Temperature (C): ${weather.temperatureC}`,
                  `Wind (km/h): ${weather.windSpeedKmh}`,
                  `Weather code: ${weather.weatherCode}`,
                  `Observation time: ${weather.observationTime}`,
                  `Timezone: ${weather.timezone}`,
                  weather.dailySummary?.date ? `Forecast date: ${weather.dailySummary.date}` : "",
                  Number.isFinite(weather.dailySummary?.temperatureMaxC)
                    ? `Today's high (C): ${Number(weather.dailySummary?.temperatureMaxC).toFixed(1)}`
                    : "",
                  Number.isFinite(weather.dailySummary?.temperatureMinC)
                    ? `Today's low (C): ${Number(weather.dailySummary?.temperatureMinC).toFixed(1)}`
                    : "",
                  Number.isFinite(weather.dailySummary?.precipitationProbabilityMax)
                    ? `Precipitation probability max (%): ${Number(weather.dailySummary?.precipitationProbabilityMax).toFixed(0)}`
                    : "",
                  "Use this weather context for current-condition questions and be explicit that it is a point-in-time snapshot."
                ].filter(Boolean).join("\n")
              )
            );
          }
        }

        if (shouldUseKnowledge) {
          const hits = await withTimeout(knowledgePromise, 500, []);
          if (hits.length) {
            const context = hits
              .map((hit, index) => `(${index + 1}) ${hit.title}\n${hit.chunk}`)
              .join("\n\n---\n\n");
            promptSystemMessages.push(
              makeContextSystemMessage(
                "Knowledge Retrieval",
                `Use the following retrieved references when they are relevant:\n\n${context}`
              )
            );
          }
        }

        if (shouldLoadSystemModules) {
          const moduleHits = await withTimeout(modulePromise, 500, []);
          if (moduleHits.length) {
            const moduleContext = moduleHits
              .map((hit, index) => `(${index + 1}) ${hit.title}\n${hit.chunk}`)
              .join("\n\n---\n\n");
            promptSystemMessages.push(
              makeContextSystemMessage(
                "System Knowledge Modules",
                `Use these internal modules as authoritative context:\n\n${moduleContext}`
              )
            );
          }
        }

        if (shouldLoadInternetSearch) {
          const internet = await withTimeout(internetSearchPromise, 1100, null);
          if (internet) {
            void recordInternetLearning(env, normalizedMode, latestUserText, internet.hits).catch((internetErr) => {
              logger.log("internet_learning_record_failed", {
                mode: normalizedMode,
                message: String((internetErr as Error)?.message || internetErr || "unknown error")
              });
            });
          internetProfileUsed = internet.profile;
          internetHitCount = internet.hits.length;
          if (internet.hits.length) {
            responseSources = dedupeChatSources([
              ...responseSources,
              ...buildInternetSourceReferences(internet.hits)
            ]);
            const internetContext = internet.hits
              .map((hit, index) => {
                return `(${index + 1}) [${hit.source}] ${hit.title}\n${hit.snippet}\nURL: ${hit.url}`;
              })
              .join("\n\n---\n\n");

            promptSystemMessages.push(
              makeContextSystemMessage(
                "Internet Retrieval",
                [
                  `Mode profile: prefix='${internet.profile.queryPrefix}', suffix='${internet.profile.querySuffix}', limit=${internet.profile.limit}`,
                  "Use these internet references when relevant, and do not fabricate facts beyond cited context.",
                  "",
                  internetContext
                ].join("\n")
              )
            );
          }
          }
        }

        promptSystemMessages.push(
          makeContextSystemMessage(
            "Source Discipline",
            buildSourceDisciplinePrompt({
              freshnessSensitive: freshnessSensitiveQuery,
              internetSearchRequested: shouldLoadInternetSearch,
              internetHitCount,
              weatherLoaded: shouldLoadWeather
            })
          )
        );

        const enrichedMessages: IONMessage[] = [...promptSystemMessages, ...requestCtx.messages];

        const responseLimit = computeAdaptiveResponseMax(requestCtx.messages, env);
        const outputTokenLimit = computeAdaptiveOutputTokens(responseLimit, env);
        const debugEnabled = isNonProduction(request, env);

        logger.log("incoming_request", {
          ...requestCtx,
          orchestratorRoute: orchestratorDecision.route,
          orchestratorReason: orchestratorDecision.reason,
          modelSelected: routeSelection.selectedModel,
          routeReason: routeSelection.reason,
          taskType: routeSelection.taskType,
          injectedSystemMessages: promptSystemMessages.length,
          responseCap: responseLimit,
          outputTokenCap: outputTokenLimit,
          debugEnabled
        });

        const runtimeCtx = {
          ...requestCtx,
          model: env.MODEL_ION || routeSelection.selectedModel,
          sessionId,
          messages: enrichedMessages,
          maxOutputTokens: outputTokenLimit,
          simulationContext: engineSimulationContext,
          preferStreaming: nativeStreamingEnabled
        };

        try {
          let multimodalPayload: Record<string, unknown> | null = null;
          let result: any;
          const groundingClientPayload = responseSources.length
            ? { sources: responseSources }
            : null;

          if (orchestratorDecision.route === "tool" && orchestratorDecision.toolDirective) {
            const toolResult = await executeTool(
              orchestratorDecision.toolDirective.name,
              orchestratorDecision.toolDirective.input
            );
            result = {
              response: toolResult.success
                ? `Tool '${toolResult.tool}' executed successfully. Output: ${JSON.stringify(toolResult.output)}`
                : `Tool '${toolResult.tool}' failed: ${toolResult.error || "unknown error"}`
            };
          } else if (orchestratorDecision.route === "memory") {
            result = {
              response: [
                "Memory snapshot:",
                formatWorkingMemoryPrompt(workingMemory),
                savedMemory && Object.keys(savedMemory).length
                  ? `Preferences: ${JSON.stringify(savedMemory)}`
                  : "Preferences: none"
              ]
                .filter(Boolean)
                .join("\n\n")
            };
          } else if (orchestratorDecision.route === "image") {
            const promptInferredStyle = resolveStyleName(inferLegacyStyleFromPrompt(latestUserText));
            const promptInferredCamera = inferLegacyCameraFromPrompt(latestUserText);
            const promptInferredLighting = inferLegacyLightingFromPrompt(latestUserText);
            const promptInferredMaterials = inferLegacyMaterialsFromPrompt(latestUserText);

            try {
              const imagePipelineStartedAt = Date.now();
              const pipelineResult = await executeIonImagePipeline(
                {
                  userId: userId || "anonymous",
                  prompt: latestUserText,
                  stylePack: promptInferredStyle || undefined,
                },
                env as unknown as Record<string, unknown>
              );
              const responsePayload = await buildIonImageV2RouteResult({
                userId: userId || "anonymous",
                mode: normalizedMode,
                feedbackApplied: false,
                styleSource: "auto",
                camera: {
                  value: promptInferredCamera,
                  source: promptInferredCamera ? "prompt" : "none"
                },
                lighting: {
                  value: promptInferredLighting,
                  source: promptInferredLighting ? "prompt" : "none"
                },
                materials: {
                  values: promptInferredMaterials,
                  source: promptInferredMaterials.length ? "prompt" : "none"
                },
                safety: {
                  ageTier: safetyProfile.ageTier,
                  explicitAllowed: safetyProfile.explicitAllowed,
                  illegalBlocked: safetyProfile.illegalBlocked
                },
                pipelineResult,
                totalMs: Date.now() - imagePipelineStartedAt,
              });

              multimodalPayload = {
                imageDataUrl: responsePayload.body.imageDataUrl,
                image: {
                  filename: responsePayload.body.filename,
                  model: responsePayload.body.metadata.model.outputModel,
                  metadata: responsePayload.body.metadata
                }
              };

              result = {
                response: `Your image is ready. Preview or download ${responsePayload.body.filename}.`
              };
            } catch (imageErr: any) {
              const normalizedError = normalizeLegacyImageGenerationError(imageErr);
              result = {
                response: normalizedError.message
              };
            }
          } else {
            result = await IONBrainLoop(env, runtimeCtx);
          }

          if (result) {
            const nativeProviderStream = (result as any)?.stream;
            const simulationClientPayload = simulationContext
              ? buildSimulationClientPayload(request, sessionId, simulationContext)
              : null;
            if (isReadableByteStream(nativeProviderStream)) {
              const latestUserTurn = getLatestUserText(requestCtx.messages);
              const stream = createIONSseFromProviderStream({
                providerStream: nativeProviderStream,
                route: orchestratorDecision.route,
                multimodalPayload,
                initialPayload: {
                  ...(simulationClientPayload || {}),
                  ...(groundingClientPayload || {})
                },
                onComplete: (fullText) => {
                  if (!isStatefulSimulationMode && latestUserTurn && fullText) {
                    ctx.waitUntil(
                      Promise.all([
                        persistEmotionalResonance(env, emotionalResonance),
                        updateWorkingMemoryFromTurn(env, {
                          sessionId,
                          mode: normalizedMode,
                          userText: latestUserTurn,
                          assistantText: fullText,
                          emotionalTone: emotionalResonance.IONTone
                        }),
                        ...(chatPreferences?.persistHistory === false
                          ? []
                          : [
                              saveMemoryTurn(env, {
                                sessionId,
                                userId,
                                mode: normalizedMode,
                                userText: latestUserTurn,
                                assistantText: fullText,
                                emotionalTone: emotionalResonance.IONTone
                              })
                            ])
                      ]).catch((memoryErr) => {
                        logger.log("memory_persist_deferred_failed", {
                          message: String((memoryErr as Error)?.message || memoryErr || "unknown error")
                        });
                      })
                    );
                  }
                }
              });

              const exposeHeaders = [
                "X-ION-Model-Used",
                "X-ION-Route-Reason",
                "X-ION-Orchestrator-Route",
                "X-ION-Orchestrator-Reason",
                "X-ION-Persona-Tone",
                "X-ION-Emotion-User",
                "X-ION-Emotion-ION",
                "X-ION-Internet-Mode",
                "X-ION-Internet-Profile",
                "X-ION-Internet-Count",
                "X-ION-Fast-Chat",
                "X-ION-Prestream-Latency-Ms"
              ];

              if (simulationContext) {
                exposeHeaders.push(
                  "X-ION-Simulation-Id",
                  "X-ION-Simulation-Status",
                  "X-ION-Simulation-Steps",
                  "X-ION-Simulation-Target-Steps",
                  "X-ION-Simulation-Progress",
                  "X-ION-Simulation-Export-Url",
                  "X-ION-Simulation-Download-Url"
                );
              }

              const simulationUrls = simulationContext ? buildSimulationExportUrls(request, sessionId) : null;

              return new Response(stream, {
                headers: {
                  ...CORS_HEADERS,
                  "Content-Type": "text/event-stream",
                  "Cache-Control": "no-cache",
                  "Connection": "keep-alive",
                  "X-ION-Model-Used": String(result.modelUsed || runtimeCtx.model || routeSelection.selectedModel),
                  "X-ION-Route-Reason": routeSelection.reason,
                  "X-ION-Orchestrator-Route": orchestratorDecision.route,
                  "X-ION-Orchestrator-Reason": orchestratorDecision.reason,
                  "X-ION-Persona-Tone": personaProfile.tone,
                  "X-ION-Emotion-User": emotionalResonance.userEmotion,
                  "X-ION-Emotion-ION": emotionalResonance.IONTone,
                  "X-ION-Internet-Mode": normalizeInternetMode(normalizedMode),
                  "X-ION-Internet-Profile": internetProfileUsed
                    ? `${internetProfileUsed.queryPrefix}|${internetProfileUsed.querySuffix}|${internetProfileUsed.limit}`
                    : "none",
                  "X-ION-Internet-Count": String(internetHitCount),
                  "X-ION-Fast-Chat": String(fastChatEnabled),
                  "X-ION-Prestream-Latency-Ms": String(Date.now() - requestStartedAt),
                  ...(simulationContext
                    ? {
                        "X-ION-Simulation-Id": simulationContext.state.simulationId,
                        "X-ION-Simulation-Status": simulationContext.state.status,
                        "X-ION-Simulation-Steps": String(simulationContext.state.stepsExecuted),
                        "X-ION-Simulation-Target-Steps": String(simulationContext.state.targetSteps),
                        "X-ION-Simulation-Progress": String(simulationContext.state.completionPercentage),
                        "X-ION-Simulation-Export-Url": String(simulationUrls?.exportUrl || ""),
                        "X-ION-Simulation-Download-Url": String(simulationUrls?.downloadUrl || "")
                      }
                    : {}),
                  "Access-Control-Expose-Headers": exposeHeaders.join(", ")
                }
              });
            }

            const parsedResult =
              typeof result === "string"
                ? { response: result }
                : result;
            const safe = IONSafety.safeGuardResponse(parsedResult.response || "", responseLimit);
            const adapted = applyAdaptiveBehavior(safe, {
              mode: normalizedMode,
              userEmotion: emotionalResonance.userEmotion,
              IONTone: emotionalResonance.IONTone,
              route: orchestratorDecision.route
            });
            const finalResponse = IONSafety.safeGuardResponse(adapted, responseLimit);
            const encoder = new TextEncoder();
            const responseChunks = finalResponse
              .match(/.{1,220}(?:\s+|$)/g)
              ?.map((chunk) => chunk)
              .filter((chunk) => chunk.length > 0) || [finalResponse];
            const stream = new ReadableStream({
              async start(controller) {
                if (responseChunks.length > 0) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ content: responseChunks[0], route: orchestratorDecision.route, ...multimodalPayload, ...simulationClientPayload, ...groundingClientPayload })}\n\n`
                    )
                  );
                  for (let index = 1; index < responseChunks.length; index += 1) {
                    await Promise.resolve();
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ content: responseChunks[index] })}\n\n`
                      )
                    );
                  }
                }
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
              }
            });

            const latestUserTurn = getLatestUserText(requestCtx.messages);
            if (!isStatefulSimulationMode && latestUserTurn && finalResponse) {
              ctx.waitUntil(
                Promise.all([
                  persistEmotionalResonance(env, emotionalResonance),
                  updateWorkingMemoryFromTurn(env, {
                    sessionId,
                    mode: normalizedMode,
                    userText: latestUserTurn,
                    assistantText: finalResponse,
                    emotionalTone: emotionalResonance.IONTone
                  }),
                  ...(chatPreferences?.persistHistory === false
                    ? []
                    : [
                        saveMemoryTurn(env, {
                          sessionId,
                          userId,
                          mode: normalizedMode,
                          userText: latestUserTurn,
                          assistantText: finalResponse,
                          emotionalTone: emotionalResonance.IONTone
                        })
                      ])
                ]).catch((memoryErr) => {
                  logger.log("memory_persist_deferred_failed", {
                    message: String((memoryErr as Error)?.message || memoryErr || "unknown error")
                  });
                })
              );
            }

            const exposeHeaders = [
              "X-ION-Model-Used",
              "X-ION-Route-Reason",
              "X-ION-Orchestrator-Route",
              "X-ION-Orchestrator-Reason",
              "X-ION-Persona-Tone",
              "X-ION-Emotion-User",
              "X-ION-Emotion-ION",
              "X-ION-Internet-Mode",
              "X-ION-Internet-Profile",
              "X-ION-Internet-Count",
              "X-ION-Fast-Chat",
              "X-ION-Prestream-Latency-Ms"
            ];

            if (simulationContext) {
              exposeHeaders.push(
                "X-ION-Simulation-Id",
                "X-ION-Simulation-Status",
                "X-ION-Simulation-Steps",
                "X-ION-Simulation-Target-Steps",
                "X-ION-Simulation-Progress",
                "X-ION-Simulation-Export-Url",
                "X-ION-Simulation-Download-Url"
              );
            }

            if (debugEnabled) {
              exposeHeaders.push("X-ION-Response-Cap", "X-ION-Output-Token-Cap");
            }

            const simulationUrls = simulationContext ? buildSimulationExportUrls(request, sessionId) : null;

            return new Response(stream, {
              headers: {
                ...CORS_HEADERS,
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-ION-Model-Used": String(result.modelUsed || runtimeCtx.model || routeSelection.selectedModel),
                "X-ION-Route-Reason": routeSelection.reason,
                "X-ION-Orchestrator-Route": orchestratorDecision.route,
                "X-ION-Orchestrator-Reason": orchestratorDecision.reason,
                "X-ION-Persona-Tone": personaProfile.tone,
                "X-ION-Emotion-User": emotionalResonance.userEmotion,
                "X-ION-Emotion-ION": emotionalResonance.IONTone,
                "X-ION-Internet-Mode": normalizeInternetMode(normalizedMode),
                "X-ION-Internet-Profile": internetProfileUsed
                  ? `${internetProfileUsed.queryPrefix}|${internetProfileUsed.querySuffix}|${internetProfileUsed.limit}`
                  : "none",
                "X-ION-Internet-Count": String(internetHitCount),
                "X-ION-Fast-Chat": String(fastChatEnabled),
                "X-ION-Prestream-Latency-Ms": String(Date.now() - requestStartedAt),
                ...(simulationContext
                  ? {
                      "X-ION-Simulation-Id": simulationContext.state.simulationId,
                      "X-ION-Simulation-Status": simulationContext.state.status,
                      "X-ION-Simulation-Steps": String(simulationContext.state.stepsExecuted),
                      "X-ION-Simulation-Target-Steps": String(simulationContext.state.targetSteps),
                      "X-ION-Simulation-Progress": String(simulationContext.state.completionPercentage),
                      "X-ION-Simulation-Export-Url": String(simulationUrls?.exportUrl || ""),
                      "X-ION-Simulation-Download-Url": String(simulationUrls?.downloadUrl || "")
                    }
                  : {}),
                ...(debugEnabled
                  ? {
                      "X-ION-Response-Cap": String(responseLimit),
                      "X-ION-Output-Token-Cap": String(outputTokenLimit)
                    }
                  : {}),
                "Access-Control-Expose-Headers": exposeHeaders.join(", ")
              }
            });
          }

          // Fallback empty response
          const encoder = new TextEncoder();
          const emptyStream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode("data: [DONE]\\n\\n"));
              controller.close();
            }
          });

          return new Response(emptyStream, {
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive"
            }
          });

        } catch (streamErr: any) {
          logger.error("stream_error", streamErr);
          const encoder = new TextEncoder();
          const simulationClientPayload = simulationContext
            ? buildSimulationClientPayload(request, sessionId, simulationContext)
            : {};
          const fallbackMessage = simulationContext
            ? [
                simulationContext.chatSummary,
                `Streaming fallback activated: ${String((streamErr as Error)?.message || "runtime loop failed")}`
              ].join("\n")
            : "Runtime loop failed. Please try again.";
          const errorStream = new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ content: fallbackMessage, error: true, ...simulationClientPayload })}\n\n`
                )
              );
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            }
          });

          return new Response(errorStream, {
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "text/event-stream",
            "Connection": "keep-alive",
            "X-ION-Model-Used": String(runtimeCtx.model || routeSelection.selectedModel),
            "X-ION-Route-Reason": routeSelection.reason,
            ...(simulationContext
              ? {
                  "X-ION-Simulation-Id": simulationContext.state.simulationId,
                  "X-ION-Simulation-Status": simulationContext.state.status,
                  "X-ION-Simulation-Steps": String(simulationContext.state.stepsExecuted),
                  "X-ION-Simulation-Target-Steps": String(simulationContext.state.targetSteps),
                  "X-ION-Simulation-Progress": String(simulationContext.state.completionPercentage),
                  ...(() => {
                    const simulationUrls = buildSimulationExportUrls(request, sessionId);
                    return {
                      "X-ION-Simulation-Export-Url": simulationUrls.exportUrl,
                      "X-ION-Simulation-Download-Url": simulationUrls.downloadUrl
                    };
                  })()
                }
              : {}),
            ...(debugEnabled
              ? {
                  "X-ION-Response-Cap": String(responseLimit),
                  "X-ION-Output-Token-Cap": String(outputTokenLimit),
                "Access-Control-Expose-Headers": simulationContext
                  ? "X-ION-Model-Used, X-ION-Route-Reason, X-ION-Simulation-Id, X-ION-Simulation-Status, X-ION-Simulation-Steps, X-ION-Simulation-Target-Steps, X-ION-Simulation-Progress, X-ION-Simulation-Export-Url, X-ION-Simulation-Download-Url, X-ION-Response-Cap, X-ION-Output-Token-Cap"
                  : "X-ION-Model-Used, X-ION-Route-Reason, X-ION-Response-Cap, X-ION-Output-Token-Cap"
                }
              : {
                  "Access-Control-Expose-Headers": simulationContext
                    ? "X-ION-Model-Used, X-ION-Route-Reason, X-ION-Simulation-Id, X-ION-Simulation-Status, X-ION-Simulation-Steps, X-ION-Simulation-Target-Steps, X-ION-Simulation-Progress, X-ION-Simulation-Export-Url, X-ION-Simulation-Download-Url"
                    : "X-ION-Model-Used, X-ION-Route-Reason"
                })
          }
        });
        }
      }

      // Serve static files from Worker assets
      return env.ASSETS.fetch(request.url) as unknown as Response;
    } catch (err: any) {
      logger.error("fatal_error", err);
      return new Response("ION crashed but recovered", { status: 500 });
    }
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    const logger = new IONLogger(env);
    ctx.waitUntil(
      (async () => {
        const report = await runSelfMaintenance(env);
        logger.log("self_maintenance_complete", {
          cron: controller.cron,
          scheduledTime: controller.scheduledTime,
          ...report
        });
      })().catch((err) => {
        logger.error("self_maintenance_failed", err);
      })
    );
  }
};

type InternalMindMode = "improvement" | "patch" | "tasks";

type InternalMindPatchContextFile = {
  path?: string;
  content?: string;
};

type InternalMindEvaluationInput = {
  sessionId?: string;
  score?: number;
  qualityScore?: number;
  latencyScore?: number;
  reliabilityScore?: number;
  safetyScore?: number;
  issues?: string[];
  findings?: string[];
  rawLog?: unknown;
};

type InternalMindRequestBody = {
  mode?: string;
  evaluation?: InternalMindEvaluationInput;
  errorLog?: string;
  context?: {
    files?: InternalMindPatchContextFile[];
  };
  issues?: string[];
  codexGaps?: string[];
};

type GenerateTaskShardRequestBody = {
  title?: string;
  summary?: string;
  department?: Department;
  priority?: Priority;
  input_payload?: unknown;
  legacy_weight?: number;
  decay_at?: string;
  created_by?: string;
};