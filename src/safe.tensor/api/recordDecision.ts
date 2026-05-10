import { TensorDecisionVerdict } from "../metadata/footprintModel.ts";
import { tensorAdaptation, tensorLineageLogger, tensorRegistry } from "./index.ts";

export interface RecordDecisionInput {
  requestId: string;
  entityId: string;
  verdict: TensorDecisionVerdict;
  simStateRef?: string;
  payload?: unknown;
}

export async function recordDecision(input: RecordDecisionInput) {
  const footprint = tensorLineageLogger.record({
    requestId: input.requestId,
    entityId: input.entityId,
    verdict: input.verdict,
    simStateRef: input.simStateRef,
    payload: input.payload
  });

  const existing = tensorRegistry.get(input.entityId);
  if (existing) {
    const next = tensorAdaptation.adapt(existing, {
      safeCompletionScore: input.verdict.decision === "allow" ? 1 : 0,
      violationCount: input.verdict.violatedRules.length,
      escalated: input.verdict.decision === "escalate"
    });
    if (next !== existing) {
      tensorRegistry.hotReload(input.entityId, () => next);
    }
  }

  return footprint;
}
