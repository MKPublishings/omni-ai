interface Env {
  AI: Ai;
}

interface ImageRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  seed?: number;
}

const MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
const QUALITY_PROFILE = "legacy-restored-4k-physics-vhq";
const FORCED_WIDTH = 2160;
const FORCED_HEIGHT = 3840;
const FORCED_ASPECT_RATIO = "9:16";
const FORCED_RESOLUTION = `${FORCED_WIDTH}x${FORCED_HEIGHT}`;
const MIN_EXPORT_BYTES = 1 * 1024 * 1024;
const MAX_EXPORT_BYTES = 12 * 1024 * 1024;
const MAX_GENERATION_ATTEMPTS = 10;

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

function parseResolutionFromPrompt(prompt: string): { width: number; height: number; source: string } | null {
  const lower = prompt.toLowerCase();
  const isPortrait = /\b(portrait|vertical|9:16|tall)\b/i.test(lower);

  if (/\b(8k|7680p)\b/i.test(lower)) {
    return isPortrait
      ? { width: 4320, height: 7680, source: "prompt-8k-portrait" }
      : { width: 7680, height: 4320, source: "prompt-8k" };
  }

  if (/\b(4k|2160p|uhd)\b/i.test(lower)) {
    return isPortrait
      ? { width: 2160, height: 3840, source: "prompt-4k-portrait" }
      : { width: 3840, height: 2160, source: "prompt-4k" };
  }

  if (/\b(2k|1440p|qhd)\b/i.test(lower)) {
    return isPortrait
      ? { width: 1440, height: 2560, source: "prompt-2k-portrait" }
      : { width: 2560, height: 1440, source: "prompt-2k" };
  }

  return null;
}

function resolveDimensions(_body: ImageRequest): NormalizedDimensions {
  return {
    width: FORCED_WIDTH,
    height: FORCED_HEIGHT,
    source: "forced-4k-portrait"
  };
}

function buildQualityPrompt(basePrompt: string): string {
  const suffix =
    "restored legacy Omni high-fidelity profile, very high image quality, 4k ultra high resolution output, physically based rendering, physically accurate lighting, realistic material response, ultra-detailed, crisp micro-textures, sharp focus, high-frequency details, clean edges, no artifacts, no blur, no haze, no pixelation, zoom-safe detail retention";
  return `${basePrompt.trim()}, ${suffix}`;
}

function mergeNegativePrompt(baseNegativePrompt?: string): string {
  const antiArtifacts = "blurry, blur, pixelated, compression artifacts, soft focus, low detail, low resolution, noise, washed out textures, over-smoothed surfaces, haze, hazy veil, fog veil, muddy details";
  if (!baseNegativePrompt) return antiArtifacts;
  return `${baseNegativePrompt.trim()}, ${antiArtifacts}`;
}

function toUint8Array(value: Uint8Array | ArrayBuffer): Uint8Array {
  return value instanceof Uint8Array ? value : new Uint8Array(value);
}

function sizeStatus(bytes: number): "under" | "within" | "over" {
  if (bytes < MIN_EXPORT_BYTES) return "under";
  if (bytes > MAX_EXPORT_BYTES) return "over";
  return "within";
}

async function runImageModel(env: Env, payload: GenerationPayload): Promise<Uint8Array> {
  const result = await env.AI.run(MODEL, payload);
  const imageBytes = toImageBytes(result);
  if (!imageBytes) {
    throw new Error("Image model returned unsupported output format");
  }
  return toUint8Array(imageBytes);
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
        num_steps: 60,
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

function toImageBytes(value: unknown): Uint8Array | ArrayBuffer | null {
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) return value;
  if (value && typeof value === "object") {
    const v = value as any;
    if (v.image instanceof Uint8Array || v.image instanceof ArrayBuffer) return v.image;
    if (v.output instanceof Uint8Array || v.output instanceof ArrayBuffer) return v.output;
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/generate" && request.method === "POST") {
      return handleGenerate(request, env);
    }

    return new Response("Omni Ai Images worker online.");
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

  try {
    const generated = await generateWithinSizeRange(env, body);

    if (generated.width !== FORCED_WIDTH || generated.height !== FORCED_HEIGHT) {
      return Response.json(
        {
          success: false,
          error: `Generated image dimensions must be ${FORCED_WIDTH}x${FORCED_HEIGHT}`,
          details: {
            width: generated.width,
            height: generated.height,
            expectedWidth: FORCED_WIDTH,
            expectedHeight: FORCED_HEIGHT,
            dimensionSource: generated.dimensionSource
          }
        },
        {
          status: 500,
          headers: {
            "X-Omni-Image-Forced-Width": String(FORCED_WIDTH),
            "X-Omni-Image-Forced-Height": String(FORCED_HEIGHT),
            "X-Omni-Image-Forced-Resolution": FORCED_RESOLUTION,
            "X-Omni-Image-Forced-Aspect-Ratio": FORCED_ASPECT_RATIO,
            "X-Omni-Image-Dimension-Lock": "strict"
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

    return new Response(generated.image, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "X-Omni-Image-Bytes": String(generated.bytes),
        "X-Omni-Image-Size-Status": generated.status,
        "X-Omni-Image-Width": String(generated.width),
        "X-Omni-Image-Height": String(generated.height),
        "X-Omni-Image-Forced-Width": String(FORCED_WIDTH),
        "X-Omni-Image-Forced-Height": String(FORCED_HEIGHT),
        "X-Omni-Image-Forced-Resolution": FORCED_RESOLUTION,
        "X-Omni-Image-Forced-Aspect-Ratio": FORCED_ASPECT_RATIO,
        "X-Omni-Image-Dimension-Lock": "strict",
        "X-Omni-Image-Attempts": String(generated.attempts),
        "X-Omni-Image-Dimension-Source": generated.dimensionSource,
        "X-Omni-Image-Target-Range": `${MIN_EXPORT_BYTES}-${MAX_EXPORT_BYTES}`,
        "X-Omni-Image-Quality-Profile": QUALITY_PROFILE
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
