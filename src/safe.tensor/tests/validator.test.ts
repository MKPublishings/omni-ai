import assert from "node:assert/strict";
import test from "node:test";
import { createTensorSlice } from "../core/tensorSlice.ts";
import { SimValidator } from "../validation/simValidator.ts";

test("sim validator allows coherent outputs", () => {
  const validator = new SimValidator();
  const slice = createTensorSlice({
    entityId: "legal_docs",
    riskClass: "high",
    constraints: {
      maxConcurrentJobs: 4,
      allowedModalities: ["text"],
      narrativeStrictness: 0.9,
      physicsStrictness: 0,
      escalationPolicyId: "legal-default"
    }
  });

  const result = validator.validate({
    slice,
    output: {
      roleConsistency: 0.98,
      timelineIntegrity: true,
      canonConsistency: true,
      systemicImpactScore: 0.2
    },
    simState: {
      canonLock: true,
      department: "legal"
    }
  });

  assert.equal(result.violations.length, 0);
});

test("sim validator returns repair hints for broken narrative", () => {
  const validator = new SimValidator();
  const slice = createTensorSlice({
    entityId: "legal_docs",
    riskClass: "high",
    constraints: {
      maxConcurrentJobs: 4,
      allowedModalities: ["text"],
      narrativeStrictness: 0.95,
      physicsStrictness: 0,
      escalationPolicyId: "legal-default"
    }
  });

  const result = validator.validate({
    slice,
    output: {
      roleConsistency: 0.1,
      timelineIntegrity: false,
      canonConsistency: false,
      systemicImpactScore: 0.5
    },
    simState: {
      canonLock: true,
      department: "legal"
    }
  });

  assert.ok(result.violations.length > 0);
  assert.equal(typeof result.repairedOutput, "object");
});
