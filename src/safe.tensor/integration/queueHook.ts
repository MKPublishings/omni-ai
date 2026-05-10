import { RouterHookResult } from "./routerHook.ts";

export interface QueueHookResult {
  action: "commit" | "block" | "escalate";
  reasons: string[];
  payload?: unknown;
}

export function queueHook(result: RouterHookResult): QueueHookResult {
  if (result.verdict === "allow") {
    return {
      action: "commit",
      reasons: ["safe.tensor verdict allow"],
      payload: result.repairedOutput
    };
  }

  if (result.verdict === "escalate") {
    return {
      action: "escalate",
      reasons: result.reasons
    };
  }

  return {
    action: "block",
    reasons: result.reasons
  };
}
