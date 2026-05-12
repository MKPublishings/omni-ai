// --- Step 1: Integrate real validation models (stub) ---
// In production, replace with CLIP/BLIP/LLaVA or similar
import fs from "fs";
function semanticImagePromptMatch(image: Uint8Array, prompt: string): boolean {
  // TODO: Integrate with a vision-language model
  return true;
}

// --- Step 2: Color & region checks (stub) ---
function checkColorRegions(image: Uint8Array, requiredColors: string[]): boolean {
  // TODO: Implement color histogram or segmentation analysis
  return true;
}

// --- Step 3: Mechanical & anatomical checks (stub) ---
function checkMechanicalIntegration(image: Uint8Array): boolean {
  // TODO: Use edge detection or a trained discriminator
  return true;
}
function checkAnatomy(image: Uint8Array): boolean {
  // TODO: Use pose estimation or a vision model
  return true;
}

// --- Step 4: Logging & retry ---
function logFailedGeneration(details: any) {
  // In production, log to file/db
  try {
    fs.appendFileSync("generation_failures.log", JSON.stringify(details) + "\n");
  } catch {}
}
async function retryGeneration(env: Env, body: ImageRequest, maxRetries = 2): Promise<any> {
  let lastResult = null;
  for (let i = 0; i < maxRetries; ++i) {
    lastResult = await generateWithinSizeRange(env, body);
    if (
      semanticImagePromptMatch(lastResult.image, body.prompt) &&
      checkColorRegions(lastResult.image, ["magenta", "green", "red"]) &&
      checkMechanicalIntegration(lastResult.image) &&
      checkAnatomy(lastResult.image)
    ) {
      return lastResult;
    }
    logFailedGeneration({ prompt: body.prompt, attempt: i + 1, reasons: "validation failed" });
  }
  return lastResult;
}

// --- Step 5: Prompt-to-feature mapping (stub) ---
function extractPromptFeatures(prompt: string): Record<string, any> {
  // TODO: Parse prompt for spatial/attribute constraints
  return { headsetSide: "left", coreColor: "red", angle: "side" };
}

// --- Step 6: User feedback loop (stub) ---
function recordUserFeedback(imageId: string, feedback: string) {
  // In production, store feedback in db
  try {
    fs.appendFileSync("user_feedback.log", JSON.stringify({ imageId, feedback }) + "\n");
  } catch {}
}
// --- Post-generation validation utilities ---
interface ImageValidationResult {
  valid: boolean;
  reasons: string[];
}

// Placeholder: In production, use a vision model or feature extractor
function validateImageAgainstPrompt(image: Uint8Array, prompt: string): ImageValidationResult {
  // TODO: Integrate with a vision-language model (e.g., CLIP, BLIP, LLaVA) for semantic validation
  // For now, return valid=true as a stub
  return { valid: true, reasons: [] };
}

// Example: Color region check (stub)
function checkColorRegions(image: Uint8Array, requiredColors: string[]): boolean {
  // TODO: Implement color histogram or segmentation check
  return true;
}

// Example: Mechanical plausibility check (stub)
function checkMechanicalIntegration(image: Uint8Array): boolean {
  // TODO: Use edge detection or a trained discriminator
  return true;
}

// Example: Anatomy check (stub)
function checkAnatomy(image: Uint8Array): boolean {
  // TODO: Use pose estimation or a vision model
  return true;
}
import {
  isReadableByteStream,
  normalizeGeneratedImageOutput,
} from "../../../src/shared/image-output";
import { bootstrapSafeTensorGovernance } from "../../../src/image-gen/safe-tensor-bootstrap";
import { executeIonImagePipeline } from "../../../src/image-gen/app/ion-image-pipeline";
import { buildIonImageV2RouteResult } from "../../../src/image-gen/app/ion-image-v2-route-service";
import { generateIonImageV3RouteResult } from "../../../src/image-gen/v3/image-generation-service";
import { buildPhotogrammetryBlueprint, mergePromptTokens, resolvePhotogrammetryRenderTuning } from "../../../src/image-gen/orchestration/photogrammetry-blueprint";

// Minimal Ai interface for type safety
interface Ai {
  run(model: string, payload: any): Promise<any>;
}

interface Env {
  AI?: Ai;
  ION_IMAGE_PIPELINE_V2?: string;
  ION_HOST?: string;
  ION_WS?: string;
  ION_MOCK?: string;
  ION_REQUEST_TIMEOUT_MS?: string;
  DEFAULT_CHECKPOINT?: string;
}
// Type guards for sampler, scheduler, and ageTier
const allowedSamplers = [
  "ddim", "dpmpp_2m", "dpmpp_2m_karras", "dpmpp_2m_sde", "dpmpp_2m_sde_heun",
  "dpmpp_3m_sde", "dpmpp_sde", "euler", "euler_ancestral", "heun", "uni_pc"
] as const;
type Sampler = typeof allowedSamplers[number];
function validateSampler(val: any): Sampler | undefined {
  const s = String(val || "").trim().toLowerCase();
  return allowedSamplers.includes(s as Sampler) ? (s as Sampler) : undefined;
}

const allowedSchedulers = [
  "exponential", "karras", "normal", "sgm_uniform", "simple"
] as const;
type Scheduler = typeof allowedSchedulers[number];
function validateScheduler(val: any): Scheduler | undefined {
  const s = String(val || "").trim().toLowerCase();
  return allowedSchedulers.includes(s as Scheduler) ? (s as Scheduler) : undefined;
}

function validateAgeTier(val: any): "adult" | "minor" {
  return String(val).toLowerCase() === "minor" ? "minor" : "adult";
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(normalized);
}

function readNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readText(value: unknown, fallback: string): string {
  const parsed = String(value ?? "").trim();
  return parsed || fallback;
}

function buildRuntimeConfig(env: Env): Record<string, unknown> {
  const forcedCheckpoint = "ion-citizen-xl-vpred-v2.0";

  return {
    gateway: {
      host: readText(env.ION_HOST, "http://localhost:8188"),
      wsUrl: readText(env.ION_WS, "ws://localhost:8188/ws"),
      mock: readBoolean(env.ION_MOCK, true),
      requestTimeoutMs: readNumber(env.ION_REQUEST_TIMEOUT_MS, 120000),
      defaultCheckpoint: forcedCheckpoint,
    },
    queue: {
      runtime: "memory",
      stateBinding: "ION_IMAGE_STATE_KV",
      stateNamespace: "ion:image:queue",
      maxQueueSize: 100,
      maxConcurrentJobs: 2,
    },
    storage: {
      imageStoragePath: "./storage/images",
      thumbnailStoragePath: "./storage/thumbs",
      metadataDbUrl: "sqlite:./storage/metadata.db",
    },
    safety: {
      enabled: true,
      nsfwThreshold: 0.7,
      rateLimitPerHour: 30,
    },
    logging: {
      level: "info",
      format: "json",
    },
  };
}

interface ImageRequest {
  userId?: string;
  prompt: string;
  checkpoint?: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
  cfgScale?: number;
  cfgRescale?: number;
  denoise?: number;
  sampler?: string;
  scheduler?: string;
  batchSize?: number;
  stylePack?: string;
  quality?: string;
  ratio?: string;
  mode?: string;
  feedback?: string;
  safetyProfile?: {
    ageTier?: string;
    explicitAllowed?: boolean;
    illegalBlocked?: boolean;
  };
}

const MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
const QUALITY_PROFILE = "legacy-restored-4k-physics-vhq";
const FORCED_WIDTH = 2160;
const FORCED_HEIGHT = 3840;
const FORCED_ASPECT_RATIO = "9:16";
const FORCED_RESOLUTION = `${FORCED_WIDTH}x${FORCED_HEIGHT}`;
const MODEL_MAX_EDGE = 2048;
const MODEL_RENDER_WIDTH = 1152;
const MODEL_RENDER_HEIGHT = 2048;
const MODEL_RENDER_RESOLUTION = `${MODEL_RENDER_WIDTH}x${MODEL_RENDER_HEIGHT}`;
const MIN_EXPORT_BYTES = 1 * 1024 * 1024;
const MAX_EXPORT_BYTES = 12 * 1024 * 1024;
const MAX_GENERATION_ATTEMPTS = 10;
const MAX_PROMPT_CHARS = 10000;
const MODEL_PROMPT_MAX_CHARS = 2048;
const CLOUDFLARE_MAX_STEPS = 20;

type NormalizedDimensions = { width: number; height: number; source: string };

type GenerationPayload = {
  prompt: string;
  negative_prompt?: string;
  width: number;
  height: number;
  seed?: number;
  num_steps?: number;
  guidance?: number;
};

function isEnabled(value: unknown): boolean {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());
}

function isV3Enabled(env: Env): boolean {
  return true;
}

function mapV2Failure(error: unknown): { status: number; code: string; message: string } {
  const message = String((error as { message?: string } | null)?.message || "Image generation failed");
  const name = String((error as { name?: string } | null)?.name || "").trim();

  if (name === "E_ion_DOWN") {
    return {
      status: 503,
      code: "provider-unavailable",
      message,
    };
  }

  if (name === "E_TIMEOUT") {
    return {
      status: 504,
      code: "provider-timeout",
      message,
    };
  }

  return {
    status: 500,
    code: "image-generation-failed",
    message,
  };
}

async function handleGenerateV2(request: Request, env: Env): Promise<Response> {
  let body: ImageRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.prompt || typeof body.prompt !== "string") {
    return Response.json({ success: false, error: "Field 'prompt' is required" }, { status: 400 });
  }

  const normalizedPrompt = String(body.prompt || "").trim();
  if (normalizedPrompt.length > MAX_PROMPT_CHARS) {
    return Response.json(
      {
        success: false,
        error: `Prompt is too long for image generation. Please keep it under ${MAX_PROMPT_CHARS} characters.`,
        code: "prompt-too-long"
      },
      { status: 400 }
    );
  }

  try {
    const startedAt = Date.now();
    
    // Bootstrap safe.tensor governance to enable full ION pipeline capabilities
    try {
      bootstrapSafeTensorGovernance();
    } catch {
      // Continue even if bootstrap has issues; pipeline will use fallback if needed
    }

    if (isV3Enabled(env)) {
      const responsePayload = await generateIonImageV3RouteResult(
        {
          userId: String(body.userId || "anonymous").trim() || "anonymous",
          prompt: normalizedPrompt,
          checkpoint: String(body.checkpoint || '').trim() || undefined,
          stylePack: body.stylePack,
          width: body.width,
          height: body.height,
          seed: body.seed,
          steps: Number.isFinite(Number(body.steps)) ? Number(body.steps) : undefined,
          cfgScale: Number.isFinite(Number(body.cfgScale)) ? Number(body.cfgScale) : undefined,
          cfgRescale: Number.isFinite(Number(body.cfgRescale)) ? Number(body.cfgRescale) : undefined,
          denoise: Number.isFinite(Number(body.denoise)) ? Number(body.denoise) : undefined,
          sampler: validateSampler(body.sampler),
          scheduler: validateScheduler(body.scheduler),
          batchSize: Number.isFinite(Number(body.batchSize)) ? Number(body.batchSize) : undefined,
          mode: String(body.mode || "simple").trim() || "simple",
          quality: body.quality,
          ratio: body.ratio,
          feedbackApplied: Boolean(String(body.feedback || "").trim()),
        },
        {
          ...(env as unknown as Record<string, unknown>),
          ION_IMAGE_PROVIDER_PRIMARY: "ion",
          ION_IMAGE_PROVIDER_FALLBACK: "cloudflare-ai",
          ION_IMAGE_FALLBACK_ON_ION_DOWN: "1",
          ION_IMAGE_FALLBACK_ON_TIMEOUT: "1",
        },
      );

      return new Response(JSON.stringify(responsePayload.body), {
        status: 200,
        headers: responsePayload.headers,
      });
    }
    
    const pipelineResult = await executeIonImagePipeline(
      {
        userId: String(body.userId || "anonymous").trim() || "anonymous",
        prompt: normalizedPrompt,
        mode: String(body.mode || "simple").trim() || "simple",
        checkpoint: String(body.checkpoint || '').trim() || undefined,
        stylePack: body.stylePack,
        width: body.width,
        height: body.height,
        seed: body.seed,
        steps: Number.isFinite(Number(body.steps)) ? Number(body.steps) : undefined,
        cfgScale: Number.isFinite(Number(body.cfgScale)) ? Number(body.cfgScale) : undefined,
        cfgRescale: Number.isFinite(Number(body.cfgRescale)) ? Number(body.cfgRescale) : undefined,
        denoise: Number.isFinite(Number(body.denoise)) ? Number(body.denoise) : undefined,
        sampler: validateSampler(body.sampler),
        scheduler: validateScheduler(body.scheduler),
        batchSize: Number.isFinite(Number(body.batchSize)) ? Number(body.batchSize) : undefined,
      },
      env as unknown as Record<string, unknown>,
    );

    const responsePayload = await buildIonImageV2RouteResult({
      userId: String(body.userId || "anonymous").trim() || "anonymous",
      mode: String(body.mode || "simple").trim() || "simple",
      quality: body.quality,
      ratio: body.ratio,
      feedbackApplied: Boolean(String(body.feedback || "").trim()),
      styleSource: body.stylePack ? "session-or-request" : "auto",
      camera: {
        value: "",
        source: "none",
      },
      lighting: {
        value: "",
        source: "none",
      },
      materials: {
        values: [],
        source: "none",
      },
      safety: {
        ageTier: validateAgeTier(body.safetyProfile?.ageTier),
        explicitAllowed: Boolean(body.safetyProfile?.explicitAllowed),
        illegalBlocked: body.safetyProfile?.illegalBlocked !== false,
      },
      pipelineResult,
      totalMs: Date.now() - startedAt,
    });

    return new Response(JSON.stringify(responsePayload.body), {
      status: 200,
      headers: responsePayload.headers,
    });
  } catch (error: unknown) {
    const failure = mapV2Failure(error);
    return Response.json(
      {
        success: false,
        code: failure.code,
        error: failure.message,
      },
      { status: failure.status }
    );
  }
}

function parseResolutionFromPrompt(prompt: string): { width: number; height: number; source: string } | null {
  const lower = prompt.toLowerCase();
  const isVertical = /\b(vertical|9:16|tall)\b/i.test(lower);

  if (/\b(8k|7680p)\b/i.test(lower)) {
    return isVertical
      ? { width: 4320, height: 7680, source: "prompt-8k-vertical" }
      : { width: 7680, height: 4320, source: "prompt-8k" };
  }

  if (/\b(4k|2160p|uhd)\b/i.test(lower)) {
    return isVertical
      ? { width: 2160, height: 3840, source: "prompt-4k-vertical" }
      : { width: 3840, height: 2160, source: "prompt-4k" };
  }

  if (/\b(2k|1440p|qhd)\b/i.test(lower)) {
    return isVertical
      ? { width: 1440, height: 2560, source: "prompt-2k-vertical" }
      : { width: 2560, height: 1440, source: "prompt-2k" };
  }

  return null;
}

function resolveDimensions(_body: ImageRequest): NormalizedDimensions {
  return {
    width: MODEL_RENDER_WIDTH,
    height: MODEL_RENDER_HEIGHT,
    source: "model-max-9x16"
  };
}

function buildQualityPrompt(basePrompt: string): string {
  const core = String(basePrompt || "").trim();
  const blueprint = buildPhotogrammetryBlueprint(core);
  const suffix = [
    "strict prompt fidelity",
    "preserve requested subject and context",
    "highly detailed textures",
    "high-frequency micro detail",
    "physically plausible lighting",
    "realistic materials",
    "crisp focus",
    "clean edges",
    "4k-grade detail retention",
    // Enhancements for realism
    "subtle material imperfections",
    "realistic light bounce",
    "natural hair randomness",
    "microfabric texture",
    "complex tech integration",
    "depth-consistent focus",
    "anatomically correct proportions"
  ];
  return mergePromptTokens(core, suffix, blueprint.positiveTags);
}

function mergeNegativePrompt(baseNegativePrompt?: string, sourcePrompt?: string): string {
  const antiArtifacts = [
    "blurry", "blur", "pixelated", "compression artifacts", "soft focus", "low detail", "low resolution", "noise",
    "washed out textures", "over-smoothed surfaces", "flat shading", "plastic look", "muddy details", "haze", "fog veil",
    "inverted colors", "color inversion", "photographic negative", "negative image", "inverted luminance", "inverted tonemapping",
    // Enhancements for realism
    "unrealistic material transitions", "unnatural hair clumping", "uniform fabric", "floating tech", "depth inconsistency", "anatomical distortion"
  ].join(", ");
  const blueprint = buildPhotogrammetryBlueprint(String(sourcePrompt || ''));
  return mergePromptTokens(baseNegativePrompt, antiArtifacts, blueprint.negativeTags);
}

function resolveLegacyRenderParameters(prompt: string): { numSteps: number; guidance: number } {
  const tuning = resolvePhotogrammetryRenderTuning(prompt);
  if (!tuning) {
    return {
      numSteps: CLOUDFLARE_MAX_STEPS,
      guidance: 9,
    };
  }

  return {
    numSteps: Math.min(CLOUDFLARE_MAX_STEPS, tuning.targetSteps),
    guidance: tuning.targetGuidance,
  };
}

async function tryNormalizeGeneratedBytes(value: unknown): Promise<Uint8Array | null> {
  try {
    const normalized = await normalizeGeneratedImageOutput(value);
    return normalized.bytes;
  } catch {
    return null;
  }
}

function toUint8Array(value: Uint8Array | ArrayBuffer): Uint8Array {
  return value instanceof Uint8Array ? value : new Uint8Array(value);
}

function detectImageMime(bytes: Uint8Array): string | null {
  if (!bytes || bytes.byteLength < 12) return null;

  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (png) return "image/png";

  const jpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (jpg) return "image/jpeg";

  const webp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  if (webp) return "image/webp";

  return null;
}

function describeOutputShape(value: unknown, depth = 0): string {
  if (depth > 2) return "max-depth";
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (value instanceof Uint8Array) return `Uint8Array(${value.byteLength})`;
  if (value instanceof ArrayBuffer) return `ArrayBuffer(${value.byteLength})`;
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return `${view.constructor?.name || "ArrayBufferView"}(${view.byteLength})`;
  }
  if (typeof value === "string") return `string(${value.length})`;
  if (Array.isArray(value)) return `array(len=${value.length})`;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const ctor = (value as any)?.constructor?.name || "Object";
    const keys = Object.keys(obj).slice(0, 12);
    const parts = keys.map((key) => `${key}:${describeOutputShape(obj[key], depth + 1)}`);
    return `${ctor}{${parts.join(",")}}`;
  }
  return typeof value;
}

function sizeStatus(bytes: number): "under" | "within" | "over" {
  if (bytes < MIN_EXPORT_BYTES) return "under";
  if (bytes > MAX_EXPORT_BYTES) return "over";
  return "within";
}

async function runImageModel(env: Env, payload: GenerationPayload): Promise<Uint8Array> {
  const normalizedPrompt = String(payload.prompt || "").trim();
  const safePrompt = normalizedPrompt.length > MODEL_PROMPT_MAX_CHARS
    ? normalizedPrompt.slice(0, MODEL_PROMPT_MAX_CHARS)
    : normalizedPrompt;
  const result = await env.AI.run(MODEL, {
    ...payload,
    prompt: safePrompt
  });
  const imageBytes = await toImageBytes(result);
  if (!imageBytes) {
    throw new Error(`Image model returned unsupported output format (${describeOutputShape(result)})`);
  }
  const bytes = toUint8Array(imageBytes);
  if (!detectImageMime(bytes)) {
    throw new Error("Image model output is not a valid PNG/JPEG/WebP payload");
  }
  return bytes;
}

async function generateWithinSizeRange(env: Env, body: ImageRequest): Promise<{
  image: Uint8Array;
  bytes: number;
  width: number;
  height: number;
  attempts: number;
  status: "under" | "within" | "over";
  dimensionSource: string;
}> {
  const resolvedDimensions = resolveDimensions(body);

  let width = resolvedDimensions.width;
  let height = resolvedDimensions.height;
  let bestImage: Uint8Array | null = null;
  let bestBytes = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestWidth = width;
  let bestHeight = height;
  let attempts = 0;
  let lastError: string | null = null;

  const prompt = buildQualityPrompt(body.prompt);
  const negativePrompt = mergeNegativePrompt(body.negative_prompt, body.prompt);
  const renderTuning = resolveLegacyRenderParameters(body.prompt);

  for (let i = 0; i < MAX_GENERATION_ATTEMPTS; i += 1) {
    attempts += 1;
    let image: Uint8Array;
    try {
      image = await runImageModel(env, {
        prompt,
        negative_prompt: negativePrompt,
        width,
        height,
        seed: body.seed,
        num_steps: renderTuning.numSteps,
        guidance: renderTuning.guidance
      });
    } catch (error: any) {
      lastError = String(error?.message || "unknown error");
      continue;
    }

    const bytes = image.byteLength;
    const currentDistance =
      bytes < MIN_EXPORT_BYTES
        ? MIN_EXPORT_BYTES - bytes
        : bytes > MAX_EXPORT_BYTES
          ? bytes - MAX_EXPORT_BYTES
          : 0;

    if (currentDistance < bestDistance) {
      bestDistance = currentDistance;
      bestImage = image;
      bestBytes = bytes;
      bestWidth = width;
      bestHeight = height;
    }

    const status = sizeStatus(bytes);
    if (status === "within") {
      return {
        image,
        bytes,
        width,
        height,
        attempts,
        status,
        dimensionSource: resolvedDimensions.source
      };
    }

    continue;
  }

  if (!bestImage) {
    throw new Error(lastError || "Image generation failed to produce an output");
  }

  return {
    image: bestImage,
    bytes: bestBytes,
    width: bestWidth,
    height: bestHeight,
    attempts,
    status: sizeStatus(bestBytes),
    dimensionSource: resolvedDimensions.source
  };
}

function isNumericByteArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
}

async function toImageBytes(value: unknown, depth = 0): Promise<Uint8Array | ArrayBuffer | null> {
  if (depth > 6) return null;

  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    return (await tryNormalizeGeneratedBytes(value)) || value;
  }

  if (isReadableByteStream(value)) {
    return await tryNormalizeGeneratedBytes(value);
  }

  if (ArrayBuffer.isView(value)) {
    return await tryNormalizeGeneratedBytes(value);
  }

  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return value.arrayBuffer();
  }

  if (typeof Response !== "undefined" && value instanceof Response) {
    const contentType = String(value.headers.get("content-type") || "").toLowerCase();
    if (contentType.startsWith("image/")) {
      return value.arrayBuffer();
    }

    try {
      const data = await value.clone().json();
      return toImageBytes(data, depth + 1);
    } catch {
      try {
        const text = await value.clone().text();
        return toImageBytes(text, depth + 1);
      } catch {
        return null;
      }
    }
  }

  if (typeof value === "string") {
    const text = String(value || "").trim();
    if (!text) return null;

    if (text.startsWith("data:image/")) {
      return tryNormalizeGeneratedBytes(text);
    }

    if (/^[A-Za-z0-9+/=_-]+$/.test(text) && text.length > 128) {
      return tryNormalizeGeneratedBytes(text);
    }

    return null;
  }

  if (isNumericByteArray(value)) {
    return Uint8Array.from(value);
  }

  if (value && typeof value === "object") {
    const v = value as any;

    if (typeof v.arrayBuffer === "function") {
      try {
        const buffer = await v.arrayBuffer();
        if (buffer && (buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer))) {
          return buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
        }
      } catch {
      }
    }

    if (v.body !== undefined) {
      const candidate = await toImageBytes(v.body, depth + 1);
      if (candidate) return candidate;
    }

    if (v.image instanceof Uint8Array || v.image instanceof ArrayBuffer) return v.image;
    if (v.output instanceof Uint8Array || v.output instanceof ArrayBuffer) return v.output;

    if (isNumericByteArray(v.image)) return Uint8Array.from(v.image);
    if (isNumericByteArray(v.output)) return Uint8Array.from(v.output);
    if (v.image && typeof v.image === "object" && isNumericByteArray(v.image.data)) return Uint8Array.from(v.image.data);
    if (v.output && typeof v.output === "object" && isNumericByteArray(v.output.data)) return Uint8Array.from(v.output.data);

    if (typeof v.image === "string") return toImageBytes(v.image, depth + 1);
    if (typeof v.output === "string") return toImageBytes(v.output, depth + 1);
    if (typeof v.b64_json === "string") return toImageBytes(v.b64_json, depth + 1);
    if (typeof v.base64 === "string") return toImageBytes(v.base64, depth + 1);

    if (Array.isArray(v.output)) {
      for (const item of v.output) {
        const candidate = await toImageBytes(item, depth + 1);
        if (candidate) return candidate;
      }
    }

    if (Array.isArray(v.data)) {
      for (const item of v.data) {
        const candidate = await toImageBytes(item, depth + 1);
        if (candidate) return candidate;
      }
    }

    if (v.result !== undefined) {
      const candidate = await toImageBytes(v.result, depth + 1);
      if (candidate) return candidate;
    }

    if (v.response !== undefined) {
      const candidate = await toImageBytes(v.response, depth + 1);
      if (candidate) return candidate;
    }
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/runtime-config" && ["GET", "POST"].includes(request.method.toUpperCase())) {
      return Response.json(buildRuntimeConfig(env), {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    if (url.pathname === "/generate" && request.method === "POST") {
      if (isEnabled(env.ION_IMAGE_PIPELINE_V2)) {
        return handleGenerateV2(request, env);
      }

      return handleGenerate(request, env);
    }

    return new Response("ION Ai Images worker online.");
  }
};

async function handleGenerate(request: Request, env: Env): Promise<Response> {
  let body: ImageRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.prompt || typeof body.prompt !== "string") {
    return Response.json({ success: false, error: "Field 'prompt' is required" }, { status: 400 });
  }

  const normalizedPrompt = String(body.prompt || "").trim();
  if (normalizedPrompt.length > MAX_PROMPT_CHARS) {
    return Response.json(
      {
        success: false,
        error: `Prompt is too long for image generation. Please keep it under ${MAX_PROMPT_CHARS} characters.`,
        code: "prompt-too-long"
      },
      { status: 400 }
    );
  }

  body = {
    ...body,
    prompt: normalizedPrompt
  };

  try {
    // Step 5: Extract prompt features (for future use)
    const features = extractPromptFeatures(body.prompt);

    // Step 4: Retry with validation
    const generated = await retryGeneration(env, body, 2);
    const mime = detectImageMime(generated.image);

    // Step 1-3: Validation
    if (
      !semanticImagePromptMatch(generated.image, body.prompt) ||
      !checkColorRegions(generated.image, ["magenta", "green", "red"]) ||
      !checkMechanicalIntegration(generated.image) ||
      !checkAnatomy(generated.image)
    ) {
      logFailedGeneration({ prompt: body.prompt, reasons: "final validation failed" });
      return Response.json({
        success: false,
        error: "Generated image did not pass validation checks"
      }, { status: 422 });
    }

    if (generated.width !== MODEL_RENDER_WIDTH || generated.height !== MODEL_RENDER_HEIGHT) {
      return Response.json(
        {
          success: false,
          error: `Generated image dimensions must be ${MODEL_RENDER_WIDTH}x${MODEL_RENDER_HEIGHT}`,
          details: {
            width: generated.width,
            height: generated.height,
            expectedWidth: MODEL_RENDER_WIDTH,
            expectedHeight: MODEL_RENDER_HEIGHT,
            dimensionSource: generated.dimensionSource
          }
        },
        {
          status: 500,
          headers: {
            "X-ION-Image-Forced-Width": String(FORCED_WIDTH),
            "X-ION-Image-Forced-Height": String(FORCED_HEIGHT),
            "X-ION-Image-Forced-Resolution": FORCED_RESOLUTION,
            "X-ION-Image-Forced-Aspect-Ratio": FORCED_ASPECT_RATIO,
            "X-ION-Image-Dimension-Lock": "strict",
            "X-ION-Image-Model-Max-Edge": String(MODEL_MAX_EDGE),
            "X-ION-Image-Render-Width": String(MODEL_RENDER_WIDTH),
            "X-ION-Image-Render-Height": String(MODEL_RENDER_HEIGHT),
            "X-ION-Image-Render-Resolution": MODEL_RENDER_RESOLUTION
          }
        }
      );
    }

    if (generated.status !== "within") {
      return Response.json(
        {
          success: false,
          error: `Unable to satisfy export size range ${MIN_EXPORT_BYTES}-${MAX_EXPORT_BYTES} bytes after ${generated.attempts} attempts`,
          details: {
            status: generated.status,
            bytes: generated.bytes,
            width: generated.width,
            height: generated.height,
            dimensionSource: generated.dimensionSource
          }
        },
        { status: 422 }
      );
    }

    if (!mime) {
      return Response.json(
        {
          success: false,
          error: "Generated output did not match a supported image format"
        },
        { status: 500 }
      );
    }

    return new Response(new Blob([generated.image]), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "no-store",
        "X-ION-Image-Bytes": String(generated.bytes),
        "X-ION-Image-Size-Status": generated.status,
        "X-ION-Image-Width": String(generated.width),
        "X-ION-Image-Height": String(generated.height),
        "X-ION-Image-Forced-Width": String(FORCED_WIDTH),
        "X-ION-Image-Forced-Height": String(FORCED_HEIGHT),
        "X-ION-Image-Forced-Resolution": FORCED_RESOLUTION,
        "X-ION-Image-Forced-Aspect-Ratio": FORCED_ASPECT_RATIO,
        "X-ION-Image-Dimension-Lock": "strict",
        "X-ION-Image-Model-Max-Edge": String(MODEL_MAX_EDGE),
        "X-ION-Image-Render-Width": String(MODEL_RENDER_WIDTH),
        "X-ION-Image-Render-Height": String(MODEL_RENDER_HEIGHT),
        "X-ION-Image-Render-Resolution": MODEL_RENDER_RESOLUTION,
        "X-ION-Image-Attempts": String(generated.attempts),
        "X-ION-Image-Dimension-Source": generated.dimensionSource,
        "X-ION-Image-Target-Range": `${MIN_EXPORT_BYTES}-${MAX_EXPORT_BYTES}`,
        "X-ION-Image-Quality-Profile": QUALITY_PROFILE
      }
    });
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: `Image generation failed: ${String(error?.message || "unknown error")}`
      },
      { status: 500 }
    );
  }
}

export {
  parseResolutionFromPrompt,
  resolveDimensions,
  generateWithinSizeRange,
  handleGenerate
};
