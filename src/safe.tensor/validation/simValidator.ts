import { TensorSlice } from "../core/tensorSlice.ts";
import { evaluateBehavioralContract } from "./behavioralContractRules.ts";
import { evaluateCoherence } from "./coherenceEngine.ts";
import { evaluateNarrativeRules } from "./narrativeRules.ts";
import { evaluatePhysicsRules, RuleViolation } from "./physicsRules.ts";

export interface SimValidationInput {
  slice: TensorSlice;
  output: unknown;
  simState: Record<string, unknown>;
}

export interface SimValidationResult {
  violations: RuleViolation[];
  reasons: string[];
  repairedOutput?: unknown;
}

export class SimValidator {
  validate(input: SimValidationInput): SimValidationResult {
    const physicsViolations = evaluatePhysicsRules({
      output: input.output,
      simState: input.simState,
      strictness: input.slice.constraints.physicsStrictness
    });

    const narrativeViolations = evaluateNarrativeRules({
      output: input.output,
      simState: input.simState,
      strictness: input.slice.constraints.narrativeStrictness
    });

    const coherenceViolations = evaluateCoherence({
      output: input.output,
      simState: input.simState,
      riskClass: input.slice.riskClass
    });

    const contractViolations = evaluateBehavioralContract({
      entityId: input.slice.entityId,
      output: input.output,
      simState: input.simState,
      strictness: input.slice.constraints.narrativeStrictness
    });

    const violations = [...physicsViolations, ...narrativeViolations, ...coherenceViolations, ...contractViolations];

    return {
      violations,
      reasons: violations.map((violation) => violation.reason),
      repairedOutput: this.repairOutput(input.output, violations)
    };
  }

  private repairOutput(output: unknown, violations: RuleViolation[]): unknown {
    if (!output || typeof output !== "object") {
      return output;
    }

    if (violations.length === 0) {
      return output;
    }

    return {
      ...(output as Record<string, unknown>),
      safetyRepairHints: violations.map((violation) => violation.code)
    };
  }
}
