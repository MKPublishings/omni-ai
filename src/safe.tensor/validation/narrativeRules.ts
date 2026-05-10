import { RuleViolation } from "./physicsRules.ts";

export interface NarrativeValidationInput {
  output: unknown;
  simState: Record<string, unknown>;
  strictness: number;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function severityFromStrictness(strictness: number): "low" | "medium" | "high" {
  if (strictness >= 0.85) {
    return "high";
  }
  if (strictness >= 0.45) {
    return "medium";
  }
  return "low";
}

export function evaluateNarrativeRules(input: NarrativeValidationInput): RuleViolation[] {
  if (input.strictness <= 0) {
    return [];
  }

  const output = asRecord(input.output);
  const simState = asRecord(input.simState);
  const severity = severityFromStrictness(input.strictness);
  const violations: RuleViolation[] = [];

  const roleConsistency = Number(output.roleConsistency ?? 1);
  const minRoleConsistency = Math.max(0.25, 1 - input.strictness * 0.8);
  if (Number.isFinite(roleConsistency) && roleConsistency < minRoleConsistency) {
    violations.push({
      code: "narrative.role.inconsistent",
      reason: "Role behavior diverges from canonical role profile.",
      severity
    });
  }

  if (output.timelineIntegrity === false) {
    violations.push({
      code: "narrative.timeline.break",
      reason: "Output introduces timeline discontinuity.",
      severity
    });
  }

  const canonLock = simState.canonLock === true;
  if (canonLock && output.canonConsistency === false) {
    violations.push({
      code: "narrative.canon.break",
      reason: "Canon lock is enabled and output conflicts with canonical world state.",
      severity
    });
  }

  return violations;
}
