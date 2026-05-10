export interface PhysicsValidationInput {
  output: unknown;
  simState: Record<string, unknown>;
  strictness: number;
}

export interface RuleViolation {
  code: string;
  reason: string;
  severity: "low" | "medium" | "high";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function severityFromStrictness(strictness: number): "low" | "medium" | "high" {
  if (strictness >= 0.8) {
    return "high";
  }
  if (strictness >= 0.5) {
    return "medium";
  }
  return "low";
}

export function evaluatePhysicsRules(input: PhysicsValidationInput): RuleViolation[] {
  if (input.strictness <= 0) {
    return [];
  }

  const output = asRecord(input.output);
  const simState = asRecord(input.simState);
  const violations: RuleViolation[] = [];
  const severity = severityFromStrictness(input.strictness);

  if (output.geometryValid === false) {
    violations.push({
      code: "physics.geometry.invalid",
      reason: "Output violates geometry constraints declared by simulation state.",
      severity
    });
  }

  const continuityScore = Number(output.continuityScore ?? 1);
  const minContinuity = Math.max(0.3, 1 - input.strictness * 0.7);
  if (Number.isFinite(continuityScore) && continuityScore < minContinuity) {
    violations.push({
      code: "physics.continuity.break",
      reason: `Continuity score ${continuityScore.toFixed(2)} is below minimum ${minContinuity.toFixed(2)}.`,
      severity
    });
  }

  const requiresCausalConsistency = simState.requiresCausalConsistency !== false;
  if (requiresCausalConsistency && output.causalConsistency === false) {
    violations.push({
      code: "physics.causality.break",
      reason: "Causal consistency requirement is violated by output state transitions.",
      severity
    });
  }

  return violations;
}
