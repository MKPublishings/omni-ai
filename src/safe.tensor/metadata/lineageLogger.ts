import { createHash } from "node:crypto";
import { TensorDecisionFootprint, TensorDecisionVerdict } from "./footprintModel.ts";

export interface RecordFootprintInput {
  requestId: string;
  entityId: string;
  verdict: TensorDecisionVerdict;
  simStateRef?: string;
  payload?: unknown;
}

export class LineageLogger {
  private readonly footprints: TensorDecisionFootprint[] = [];

  record(input: RecordFootprintInput): TensorDecisionFootprint {
    const serializedPayload = JSON.stringify(input.payload ?? null);
    const payloadHash = createHash("sha256").update(serializedPayload).digest("hex");

    const footprint: TensorDecisionFootprint = {
      requestId: input.requestId,
      entityId: input.entityId,
      timestamp: new Date().toISOString(),
      decision: input.verdict.decision,
      reasons: input.verdict.reasons,
      violatedRules: input.verdict.violatedRules,
      sliceVersion: input.verdict.sliceVersion,
      simStateRef: input.simStateRef,
      payloadHash
    };

    this.footprints.push(footprint);
    return footprint;
  }

  list(): TensorDecisionFootprint[] {
    return [...this.footprints];
  }
}
