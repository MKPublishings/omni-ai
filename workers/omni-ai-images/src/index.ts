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

    return new Response("Omni AI Images worker online.");
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
    const result = await env.AI.run(MODEL, {
      prompt: body.prompt,
      negative_prompt: body.negative_prompt,
      width: Number.isFinite(body.width) ? Number(body.width) : 1024,
      height: Number.isFinite(body.height) ? Number(body.height) : 1024,
      seed: body.seed
    });

    const imageBytes = toImageBytes(result);
    if (!imageBytes) {
      return Response.json({ success: false, error: "Image model returned unsupported output format" }, { status: 500 });
    }

    return new Response(imageBytes, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store"
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
