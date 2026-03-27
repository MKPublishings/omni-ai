import { runIONLLM } from "./inference";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function extractText(raw: any): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  return String(raw?.response ?? raw?.result?.response ?? raw?.output_text ?? raw?.text ?? "");
}

export async function IONAdapter(messages: ChatMessage[], mode: string, env: any) {
  if (!env?.AI?.run) {
    return { text: "[IONAdapter] AI binding not configured." };
  }

  const response = await runIONLLM(env, { mode, messages });
  return { text: extractText(response) };
}
