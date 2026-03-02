interface Env {
  AI: Ai;
}

interface AudioRequest {
  type?: "tts" | "stt";
  text?: string;
  voice?: string;
  audio?: unknown;
}

const TTS_MODEL = "@cf/openai/gpt-4o-mini-tts";
const STT_MODEL = "@cf/openai/whisper-large-v3";

function pickAudioOutput(value: unknown): Uint8Array | ArrayBuffer | null {
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) return value;
  if (value && typeof value === "object") {
    const v = value as any;
    if (v.audio instanceof Uint8Array || v.audio instanceof ArrayBuffer) return v.audio;
    if (v.output instanceof Uint8Array || v.output instanceof ArrayBuffer) return v.output;
  }
  return null;
}

function pickTranscript(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof (value as any).text === "string") return String((value as any).text);
  if (typeof (value as any).transcript === "string") return String((value as any).transcript);
  return "";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/generate" && request.method === "POST") {
      return handleGenerate(request, env);
    }

    return new Response("Omni Ai Audio worker online.");
  }
};

async function handleGenerate(request: Request, env: Env): Promise<Response> {
  let body: AudioRequest;
  try {
    body = await request.json<AudioRequest>();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const type = String(body.type || "").toLowerCase();

  if (type === "tts") {
    if (!body.text || typeof body.text !== "string") {
      return Response.json({ success: false, error: "Field 'text' is required for tts" }, { status: 400 });
    }

    try {
      const result = await env.AI.run(TTS_MODEL, {
        text: body.text,
        voice: body.voice
      });

      const audio = pickAudioOutput(result);
      if (!audio) {
        return Response.json({ success: false, error: "TTS model returned unsupported output format" }, { status: 500 });
      }

      return new Response(audio, {
        headers: {
          "Content-Type": "audio/wav",
          "Cache-Control": "no-store"
        }
      });
    } catch (error: any) {
      return Response.json(
        {
          success: false,
          error: `TTS generation failed: ${String(error?.message || "unknown error")}`
        },
        { status: 500 }
      );
    }
  }

  if (type === "stt") {
    if (!body.audio) {
      return Response.json({ success: false, error: "Field 'audio' is required for stt" }, { status: 400 });
    }

    try {
      const result = await env.AI.run(STT_MODEL, {
        audio: body.audio
      });

      const transcript = pickTranscript(result);
      return Response.json({
        success: true,
        transcript
      });
    } catch (error: any) {
      return Response.json(
        {
          success: false,
          error: `STT failed: ${String(error?.message || "unknown error")}`
        },
        { status: 500 }
      );
    }
  }

  return Response.json({ success: false, error: "Invalid type. Use 'tts' or 'stt'" }, { status: 400 });
}
