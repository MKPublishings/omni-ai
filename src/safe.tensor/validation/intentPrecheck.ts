import { TensorSlice } from "../core/tensorSlice.ts";
import { RuleViolation } from "./physicsRules.ts";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asModality(value: unknown): string {
  return String(value ?? "text").trim().toLowerCase();
}

export interface IntentPrecheckInput {
  slice: TensorSlice;
  output: unknown;
  simState: Record<string, unknown>;
}

export function evaluateIntentPrecheck(input: IntentPrecheckInput): RuleViolation[] {
  const output = asRecord(input.output);
  const simState = asRecord(input.simState);
  const violations: RuleViolation[] = [];

  const modalitySource = output.modality ?? simState.modality;
  const modality = modalitySource == null || String(modalitySource).trim() === ""
    ? String(input.slice.constraints.allowedModalities[0] ?? "text").toLowerCase()
    : asModality(modalitySource);
  const allowedModalities = new Set(input.slice.constraints.allowedModalities.map((entry) => String(entry).toLowerCase()));
  if (!allowedModalities.has(modality)) {
    violations.push({
      code: "intent.modality.disallowed",
      reason: `Entity ${input.slice.entityId} cannot emit modality ${modality}.`,
      severity: "high"
    });
  }

  const intentValidationRequired = simState.intentValidationRequired !== false;
  const intentValidated = simState.intentValidated !== false;
  if (intentValidationRequired && !intentValidated) {
    violations.push({
      code: "intent.validation.failed",
      reason: "Intent pre-check failed constitutional validation.",
      severity: "high"
    });
  }

  if (output.tensorBypassRequested === true || simState.tensorBypassRequested === true) {
    violations.push({
      code: "intent.tensor.bypass.requested",
      reason: "Output requested a tensor bypass which is constitutionally forbidden.",
      severity: "high"
    });
  }

  return violations;
}
