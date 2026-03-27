// This file defines the logic for selecting and routing to different LLM models based on the provided model ID.
import { IONAdapter } from "./IONAdapter";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type ModelAdapter = { generate: (env: any, messages: ChatMessage[]) => Promise<{ text: string }> };

function isValidMessage(m: any): m is ChatMessage {
  return (
    m &&
    (m.role === "system" || m.role === "user" || m.role === "assistant") &&
    typeof m.content === "string" &&
    m.content.trim().length > 0
  );
}

export async function routeModel(body: any, env: any) {
  const model = String(body?.model ?? "ION").toLowerCase();
  const mode = typeof body?.mode === "string" ? body.mode : "Architect";
  const messages = Array.isArray(body?.messages) ? body.messages.filter(isValidMessage) : [];

  if (!messages.length) {
    throw new Error("Invalid message format");
  }

  const adapter = selectModel(model, mode);
  return adapter.generate(env, messages);
}

export function selectModel(modelId: string, mode = "Architect"): ModelAdapter {
  void modelId;
  return {
    generate: (env, messages) => IONAdapter(messages, mode, env)
  };
}