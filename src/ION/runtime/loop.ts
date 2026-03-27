import type { IONMessage } from "../../ION/mindos-core";
import { IONBrainLoop as authoritativeLoop, type IONLoopContext } from "../../runtime/loop";

export type IONBrainContext = {
  mode: string;
  model?: string;
  messages: IONMessage[];
};

export async function IONBrainLoop(env: any, ctx: IONBrainContext): Promise<string> {
  const runtimeCtx: IONLoopContext = {
    mode: ctx.mode,
    model: ctx.model || "ION",
    messages: ctx.messages,
    maxOutputTokens: 2048
  };

  const result = await authoritativeLoop(env, runtimeCtx);
  return result.response;
}