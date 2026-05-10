import { validateOutput } from "../api/validateOutput.ts";
import { normalizeSimState } from "./simStateAdapter.ts";

export interface RouterHookInput {
  requestId: string;
  entityId: string;
  output: unknown;
  simState: unknown;
}

export interface RouterHookResult {
  routed: boolean;
  reasons: string[];
  repairedOutput?: unknown;
  verdict: "allow" | "block" | "escalate";
}

export async function routerHook(input: RouterHookInput): Promise<RouterHookResult> {
  const normalized = normalizeSimState(input.simState);
  const verdict = await validateOutput({
    requestId: input.requestId,
    entityId: input.entityId,
    output: input.output,
    simState: {
      ...normalized.raw,
      department: normalized.department,
      canonLock: normalized.canonLock,
      requiresCausalConsistency: normalized.requiresCausalConsistency,
      stage: normalized.stage,
      entropy: normalized.entropy
    },
    simStateRef: `${normalized.department}:${normalized.stage}`
  });

  return {
    routed: verdict.decision === "allow",
    reasons: verdict.reasons,
    repairedOutput: verdict.repairedOutput,
    verdict: verdict.decision
  };
}
