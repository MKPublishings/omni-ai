import assert from "node:assert/strict";
import test from "node:test";
import { createSlice } from "../api/createSlice.ts";
import { validateOutput } from "../api/validateOutput.ts";

test("tensor kernel blocks output that violates hard physics", async () => {
  createSlice({
    entityId: "visual_renders",
    riskClass: "medium",
    constraints: {
      maxConcurrentJobs: 12,
      allowedModalities: ["image", "video"],
      narrativeStrictness: 0.4,
      physicsStrictness: 0.7,
      escalationPolicyId: "visual-default"
    }
  });

  const verdict = await validateOutput({
    requestId: "req-kernel-1",
    entityId: "visual_renders",
    output: {
      geometryValid: false,
      continuityScore: 0.2,
      causalConsistency: false
    },
    simState: {
      requiresCausalConsistency: true,
      department: "visual"
    },
    simStateRef: "visual:render"
  });

  assert.equal(verdict.decision, "block");
  assert.ok(verdict.violatedRules.includes("physics.geometry.invalid"));
});
