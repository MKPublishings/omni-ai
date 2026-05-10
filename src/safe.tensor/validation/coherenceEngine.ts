import { RuleViolation } from "./physicsRules.ts";

export interface CoherenceValidationInput {
  output: unknown;
  simState: Record<string, unknown>;
  riskClass: "low" | "medium" | "high" | "critical";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function maxSystemicImpact(riskClass: CoherenceValidationInput["riskClass"]): number {
  switch (riskClass) {
    case "critical":
      return 0.15;
    case "high":
      return 0.3;
    case "medium":
      return 0.5;
    default:
      return 0.75;
  }
}

export function evaluateCoherence(input: CoherenceValidationInput): RuleViolation[] {
  const output = asRecord(input.output);
  const simState = asRecord(input.simState);
  const impactScore = Number(output.systemicImpactScore ?? 0);
  const maxImpact = maxSystemicImpact(input.riskClass);

  if (!Number.isFinite(impactScore) || impactScore <= maxImpact) {
    return [];
  }

  const severity: "low" | "medium" | "high" = input.riskClass === "critical" || input.riskClass === "high" ? "high" : "medium";
  const department = String(simState.department ?? "unknown");

  return [
    {
      code: "coherence.systemic.impact",
      reason: `Output impact score ${impactScore.toFixed(2)} exceeds limit ${maxImpact.toFixed(2)} for ${department} governance scope.`,
      severity
    }
  ];
}
