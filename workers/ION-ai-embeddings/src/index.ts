interface Env {
  AI: Ai;
}

interface EmbeddingRequest {
  text?: string;
}

const MODEL = "@cf/baai/bge-large-en-v1.5";

function normalizeEmbedding(value: unknown): number[] {
  if (Array.isArray(value) && value.every((item) => typeof item === "number")) {
    return value as number[];
  }

  if (value && typeof value === "object") {
    const v = value as any;
    if (Array.isArray(v.embedding) && v.embedding.every((item: unknown) => typeof item === "number")) {
      return v.embedding as number[];
    }
    if (Array.isArray(v.data?.[0]?.embedding) && v.data[0].embedding.every((item: unknown) => typeof item === "number")) {
      return v.data[0].embedding as number[];
    }
  }

  return [];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/generate" && request.method === "POST") {
      return handleGenerate(request, env);
    }

    return new Response("ION Ai Embeddings worker online.");
  }
};

async function handleGenerate(request: Request, env: Env): Promise<Response> {
  let body: EmbeddingRequest;
  try {
    body = await request.json<EmbeddingRequest>();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const text = String(body.text || "").trim();
  if (!text) {
    return Response.json({ success: false, error: "Field 'text' is required" }, { status: 400 });
  }

  try {
    const result = await env.AI.run(MODEL, { text });
    const embedding = normalizeEmbedding(result);

    if (!embedding.length) {
      return Response.json({ success: false, error: "Embedding model returned unsupported output format" }, { status: 500 });
    }

    return Response.json({
      success: true,
      embedding,
      dimensions: embedding.length
    });
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: `Embedding generation failed: ${String(error?.message || "unknown error")}`
      },
      { status: 500 }
    );
  }
}
