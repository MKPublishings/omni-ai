// ============================================================
// ION Ai — LLM Inference Wrapper
// Wraps Cloudflare's AI model with ION's cognitive engine.
// ============================================================

import { buildIONPrompt, IONContext } from "../ION/mindos-core";

export async function runIONLLM(env: any, ctx: IONContext) {
  const prompt = buildIONPrompt(ctx);

  const response = await env.AI.run(env.MODEL, {
    prompt,
    max_tokens: 400,
    temperature: 0.7
  });

  return response;
}