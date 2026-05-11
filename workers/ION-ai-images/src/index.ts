import {
  isReadableByteStream,
  normalizeGeneratedImageOutput,
} from "../../../src/shared/image-output";
import { bootstrapSafeTensorGovernance } from "../../../src/image-gen/safe-tensor-bootstrap";
import { executeIonImagePipeline } from "../../../src/image-gen/app/ion-image-pipeline";
import { buildIonImageV2RouteResult } from "../../../src/image-gen/app/ion-image-v2-route-service";

interface Env {
  AI?: Ai;
  ION_IMAGE_PIPELINE_V2?: string;
  COMFYUI_HOST?: string;
  COMFYUI_WS?: string;
  COMFYUI_MOCK?: string;
  COMFYUI_REQUEST_TIMEOUT_MS?: string;
  DEFAULT_CHECKPOINT?: string;
}

interface ImageRequest {
  userId?: string;
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  seed?: number;
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

function mapV2Failure(error: unknown): { status: number; code: string; message: string } {
  const message = String((error as { message?: string } | null)?.message || "Image generation failed");
  const name = String((error as { name?: string } | null)?.name || "").trim();

  if (name === "E_COMFYUI_DOWN") {
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
    body = await request.json<ImageRequest>();
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
    
    const pipelineResult = await executeIonImagePipeline(
      {
        userId: String(body.userId || "anonymous").trim() || "anonymous",
        prompt: normalizedPrompt,
        stylePack: body.stylePack,
        width: body.width,
        height: body.height,
        seed: body.seed,
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
        ageTier: String(body.safetyProfile?.ageTier || "adult"),
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
  const suffix =
    "strict prompt fidelity, preserve requested subject and context, highly detailed textures, high-frequency micro detail, physically plausible lighting, realistic materials, crisp focus, clean edges, 4k-grade detail retention";
  return `${core}, ${suffix}`;
}

function mergeNegativePrompt(baseNegativePrompt?: string): string {
  const antiArtifacts = "blurry, blur, pixelated, compression artifacts, soft focus, low detail, low resolution, noise, washed out textures, over-smoothed surfaces, flat shading, plastic look, muddy details, haze, fog veil, inverted colors, color inversion, photographic negative, negative image, inverted luminance, inverted tonemapping";
  if (!baseNegativePrompt) return antiArtifacts;
  return `${baseNegativePrompt.trim()}, ${antiArtifacts}`;
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
  const negativePrompt = mergeNegativePrompt(body.negative_prompt);

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
        num_steps: 20,
        guidance: 9
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
    body = await request.json<ImageRequest>();
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
    const generated = await generateWithinSizeRange(env, body);
    const mime = detectImageMime(generated.image);

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

    return new Response(generated.image, {
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
