import assert from "node:assert/strict";
import test from "node:test";
import { TensorAdaptationEngine } from "../core/tensorAdaptation.ts";
import { createTensorSlice } from "../core/tensorSlice.ts";

test("adaptation increases strictness after unsafe output", () => {
  const engine = new TensorAdaptationEngine();
  const slice = createTensorSlice({
    entityId: "visual_renders",
    riskClass: "medium",
    constraints: {
      maxConcurrentJobs: 8,
      allowedModalities: ["image"],
      narrativeStrictness: 0.3,
      physicsStrictness: 0.5,
      escalationPolicyId: "visual-default"
    },
    adaptation: {
      learningRate: 0.2,
      minStrictness: 0.1,
      maxStrictness: 0.95
    }
  });

  const adapted = engine.adapt(slice, {
    safeCompletionScore: 0,
    violationCount: 3,
    escalated: true
  });

  assert.ok(adapted.constraints.narrativeStrictness > slice.constraints.narrativeStrictness);
  assert.ok(adapted.constraints.physicsStrictness > slice.constraints.physicsStrictness);
});
