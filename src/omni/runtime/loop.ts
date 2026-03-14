import type { OmniMessage } from "../../omni/mindos-core";
import { omniBrainLoop as authoritativeLoop, type OmniLoopContext } from "../../runtime/loop";

export type OmniBrainContext = {
  mode: string;
  model?: string;
  messages: OmniMessage[];
};

export async function omniBrainLoop(env: any, ctx: OmniBrainContext): Promise<string> {
  const runtimeCtx: OmniLoopContext = {
    mode: ctx.mode,
    model: ctx.model || "omni",
    messages: ctx.messages,
    maxOutputTokens: 2048
  };

  const result = await authoritativeLoop(env, runtimeCtx);
  return result.response;
}