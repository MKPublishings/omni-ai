import type { R2Bucket } from "@cloudflare/workers-types";

interface Env {
  OMNI_MEDIA: R2Bucket;
  PUBLIC_BASE_URL: string;
  VIDEO_MODEL?: string;
  OMNI_MEDIA_PROVIDER_VIDEO_URL?: string;
  OMNI_MEDIA_PROVIDER_API_KEY?: string;
  OMNI_MEDIA_PROVIDER_API_KEY_HEADER?: string;
  AI: any;
}

interface VideoGenerationRequest {
  prompt: string;
  negative_prompt?: string;
  seed?: number;
  num_frames?: number;
  fps?: number;
  width?: number;
  height?: number;
  aspect_ratio?: string;
}

interface VideoGenerationResponse {
  success: boolean;
  url?: string;
  job_id?: string;
  duration_seconds?: number;
  width?: number;
  height?: number;
  fps?: number;
  error?: string;
}

const DEFAULT_VIDEO_MODEL = "@cf/cogvideox-5b";

function normalizePublicBaseUrl(value: unknown): string {
  return String(value || "").trim().replace(/\/+$/, "");
}

function toUint8Array(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (value && typeof value === "object" && (value as any).video instanceof ArrayBuffer) {
    return new Uint8Array((value as any).video);
  }

  if (value && typeof value === "object" && (value as any).video instanceof Uint8Array) {
    return (value as any).video;
  }

  return null;
}

function normalizeProviderUrl(value: unknown): string {
  return String(value || "").trim().replace(/\/+$/, "");
}

function resolveProviderUrl(value: unknown): { raw: string; normalized: string; valid: boolean; reason: string } {
  const raw = normalizeProviderUrl(value);
  if (!raw) {
    return { raw, normalized: "", valid: false, reason: "empty provider URL" };
  }

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(withScheme);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "https:" && protocol !== "http:") {
      return { raw, normalized: withScheme, valid: false, reason: "provider URL must use http or https" };
    }

    if (!parsed.hostname) {
      return { raw, normalized: withScheme, valid: false, reason: "provider URL is missing hostname" };
    }

    const host = parsed.hostname.toLowerCase();
    const looksLikeIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    const looksNumericOnly = /^\d+$/.test(host);
    const hasAlphabetic = /[a-z]/i.test(host);

    if ((looksLikeIPv4 || looksNumericOnly) && host !== "localhost") {
      return {
        raw,
        normalized: withScheme,
        valid: false,
        reason: "provider URL must use a valid domain/hostname endpoint, not a numeric-only host"
      };
    }

    if (!hasAlphabetic && host !== "localhost") {
      return {
        raw,
        normalized: withScheme,
        valid: false,
        reason: "provider URL hostname looks invalid"
      };
    }

    if (!parsed.pathname || parsed.pathname === "/") {
      return {
        raw,
        normalized: withScheme,
        valid: false,
        reason: "provider URL should point to a POST generation endpoint path"
      };
    }

    return { raw, normalized: withScheme, valid: true, reason: "ok" };
  } catch {
    return { raw, normalized: withScheme, valid: false, reason: "provider URL is not parseable" };
  }
}

function resolveProviderConfig(request: Request, env: Env): {
  providerUrl: string;
  providerKey: string;
  providerKeyHeader: string;
} {
  const headerProviderUrl = normalizeProviderUrl(request.headers.get("x-omni-provider-url"));
  const envProviderUrl = normalizeProviderUrl(env.OMNI_MEDIA_PROVIDER_VIDEO_URL);
  const providerUrl = headerProviderUrl || envProviderUrl;

  const headerProviderKey = String(request.headers.get("x-omni-provider-key") || "").trim();
  const envProviderKey = String(env.OMNI_MEDIA_PROVIDER_API_KEY || "").trim();
  const providerKey = headerProviderKey || envProviderKey;

  const headerProviderKeyHeader = String(request.headers.get("x-omni-provider-key-header") || "").trim();
  const envProviderKeyHeader = String(env.OMNI_MEDIA_PROVIDER_API_KEY_HEADER || "x-api-key").trim();
  const providerKeyHeader = headerProviderKeyHeader || envProviderKeyHeader || "x-api-key";

  return {
    providerUrl,
    providerKey,
    providerKeyHeader
  };
}

async function requestExternalProviderVideo(payload: VideoGenerationRequest, request: Request, env: Env): Promise<string> {
  const { providerUrl, providerKey, providerKeyHeader } = resolveProviderConfig(request, env);
  const resolved = resolveProviderUrl(providerUrl);
  if (!resolved.raw) return "";
  if (!resolved.valid) {
    throw new Error(`provider URL invalid: ${resolved.reason}`);
  }

  const providerTargetUrl = new URL(resolved.normalized);
  const currentRequestUrl = new URL(request.url);
  if (
    providerTargetUrl.origin === currentRequestUrl.origin &&
    providerTargetUrl.pathname === currentRequestUrl.pathname
  ) {
    return "";
  }

  const publicBase = normalizePublicBaseUrl(env.PUBLIC_BASE_URL);
  if (publicBase) {
    try {
      const publicBaseUrl = new URL(publicBase);
      if (
        providerTargetUrl.hostname === publicBaseUrl.hostname &&
        providerTargetUrl.pathname === "/generate"
      ) {
        return "";
      }
    } catch {
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (providerKey) {
    headers[providerKeyHeader] = providerKey;
  }

  const response = await fetch(resolved.normalized, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  const rawText = await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(`provider returned ${response.status}: ${rawText || "unknown error"}`);
  }

  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  const outputUrl = String(
    data?.url ||
      data?.video_url ||
      data?.output_url ||
      data?.outputs?.[0]?.url ||
      ""
  ).trim();

  if (!outputUrl) {
    throw new Error("provider response did not include a video URL");
  }

  return outputUrl;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/debug/provider-config" && request.method === "GET") {
      const resolvedProviderUrl = resolveProviderUrl(env.OMNI_MEDIA_PROVIDER_VIDEO_URL);
      const providerApiKey = String(env.OMNI_MEDIA_PROVIDER_API_KEY || "").trim();
      const providerApiKeyHeader = String(env.OMNI_MEDIA_PROVIDER_API_KEY_HEADER || "x-api-key").trim() || "x-api-key";

      return Response.json({
        provider_url_present: resolvedProviderUrl.raw.length > 0,
        provider_url_valid: resolvedProviderUrl.valid,
        provider_url_host: resolvedProviderUrl.valid ? new URL(resolvedProviderUrl.normalized).host : null,
        provider_url_reason: resolvedProviderUrl.reason,
        provider_url_normalized_preview: resolvedProviderUrl.valid ? resolvedProviderUrl.normalized : resolvedProviderUrl.normalized,
        provider_api_key_present: providerApiKey.length > 0,
        provider_api_key_header: providerApiKeyHeader
      });
    }

    if (url.pathname === "/generate" && request.method === "POST") {
      return handleGenerate(request, env);
    }

    if (url.pathname.startsWith("/v/")) {
      return handleServeVideo(url, env);
    }

    return new Response("Omni Ai Media worker online.");
  }
};

async function handleGenerate(request: Request, env: Env): Promise<Response> {
  let payload: VideoGenerationRequest;

  try {
    payload = await request.json() as VideoGenerationRequest;
  } catch {
    return Response.json(
      { success: false, error: "Invalid JSON body" } satisfies VideoGenerationResponse,
      { status: 400 }
    );
  }

  if (!payload.prompt || typeof payload.prompt !== "string") {
    return Response.json(
      { success: false, error: "Field 'prompt' is required" } satisfies VideoGenerationResponse,
      { status: 400 }
    );
  }

  const numFrames = Number.isFinite(payload.num_frames) ? Number(payload.num_frames) : 49;
  const fps = Number.isFinite(payload.fps) ? Number(payload.fps) : 24;
  const baseWidth = Number.isFinite(payload.width) ? Number(payload.width) : 576;
  const baseHeight = Number.isFinite(payload.height) ? Number(payload.height) : 320;

  try {
    const providerVideoUrl = await requestExternalProviderVideo(payload, request, env);
    if (providerVideoUrl) {
      const response: VideoGenerationResponse = {
        success: true,
        url: providerVideoUrl,
        job_id: crypto.randomUUID(),
        duration_seconds: Number((numFrames / Math.max(1, fps)).toFixed(2)),
        width: baseWidth,
        height: baseHeight,
        fps
      };

      return Response.json(response);
    }

    const videoModel = String(env.VIDEO_MODEL || DEFAULT_VIDEO_MODEL).trim() || DEFAULT_VIDEO_MODEL;
    const baseVideo = await env.AI.run(videoModel, {
      prompt: payload.prompt,
      negative_prompt: payload.negative_prompt,
      seed: payload.seed,
      num_frames: numFrames,
      fps,
      width: baseWidth,
      height: baseHeight
    });

    const videoBytes = toUint8Array(baseVideo);
    if (!videoBytes) {
      return Response.json(
        {
          success: false,
          error: "Video model returned an unsupported output format"
        } satisfies VideoGenerationResponse,
        { status: 500 }
      );
    }

    const jobId = crypto.randomUUID();
    const fileName = `video_${jobId}.mp4`;

    await env.OMNI_MEDIA.put(fileName, videoBytes, {
      httpMetadata: { contentType: "video/mp4" },
      customMetadata: {
        prompt: payload.prompt.slice(0, 200),
        fps: String(fps),
        num_frames: String(numFrames)
      }
    });

    const publicBaseUrl = normalizePublicBaseUrl(env.PUBLIC_BASE_URL);
    const fileUrl = publicBaseUrl
      ? `${publicBaseUrl}/v/${fileName}`
      : new URL(`/v/${fileName}`, request.url).toString();

    const response: VideoGenerationResponse = {
      success: true,
      url: fileUrl,
      job_id: jobId,
      duration_seconds: Number((numFrames / Math.max(1, fps)).toFixed(2)),
      width: baseWidth,
      height: baseHeight,
      fps
    };

    return Response.json(response);
  } catch (error: any) {
    const message = String(error?.message || "unknown error");

    if (/No such model|5007/i.test(message)) {
      return Response.json(
        {
          success: false,
          error:
            "Video model is unavailable in this Cloudflare AI runtime. Configure OMNI_MEDIA_PROVIDER_VIDEO_URL for external video generation."
        } satisfies VideoGenerationResponse,
        { status: 503 }
      );
    }

    return Response.json(
      {
        success: false,
        error: `Video generation failed: ${message}`
      } satisfies VideoGenerationResponse,
      { status: 500 }
    );
  }
}

async function handleServeVideo(url: URL, env: Env): Promise<Response> {
  const key = url.pathname.slice(3).trim();
  if (!key) {
    return new Response("Missing key", { status: 400 });
  }

  const object = await env.OMNI_MEDIA.get(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const httpMetadata: Record<string, string> = {};
  object.writeHttpMetadata(httpMetadata as any);
  httpMetadata["Cache-Control"] = "public, max-age=31536000, immutable";
  if (!httpMetadata["Content-Type"]) {
    httpMetadata["Content-Type"] = "video/mp4";
  }

  const headers = new Headers(Object.entries(httpMetadata));
  const arrayBuffer = await object.arrayBuffer();
  return new Response(arrayBuffer, { headers });
}
