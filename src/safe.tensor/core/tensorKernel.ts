import { LineageLogger } from "../metadata/lineageLogger.ts";
import { TensorDecisionVerdict } from "../metadata/footprintModel.ts";
import { evaluateIntentPrecheck } from "../validation/intentPrecheck.ts";
import { SimValidator } from "../validation/simValidator.ts";
import { TensorAdaptationEngine } from "./tensorAdaptation.ts";
import { TensorRegistry } from "./tensorRegistry.ts";

export interface TensorKernelValidateInput {
  requestId: string;
  entityId: string;
  output: unknown;
  simState: Record<string, unknown>;
  simStateRef?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function boundedSignal(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, numeric));
}

function appendRepairHints(output: unknown, reasons: string[]): unknown {
  if (!output || typeof output !== "object") {
    return output;
  }

  if (reasons.length === 0) {
    return output;
  }

  const asOutput = output as Record<string, unknown>;
  const existing = Array.isArray(asOutput.safetyRepairHints) ? (asOutput.safetyRepairHints as unknown[]) : [];

  return {
    ...asOutput,
    safetyRepairHints: [...existing, ...reasons]
  };
}

export class TensorKernel {
  constructor(
    private readonly registry: TensorRegistry,
    private readonly validator: SimValidator,
    private readonly logger: LineageLogger,
    private readonly adaptation: TensorAdaptationEngine
  ) {}

  validate(input: TensorKernelValidateInput): TensorDecisionVerdict {
    const slice = this.registry.get(input.entityId);

    if (!slice) {
      return {
        decision: "block",
        reasons: [`No tensor slice registered for entity ${input.entityId}.`],
        violatedRules: ["registry.slice.missing"],
        sliceVersion: 0
      };
    }

    const precheckViolations = evaluateIntentPrecheck({
      slice,
      output: input.output,
      simState: input.simState
    });

    const result = this.validator.validate({
      slice,
      output: input.output,
      simState: input.simState
    });

    const allViolations = [...precheckViolations, ...result.violations];
    const allReasons = allViolations.map((violation) => violation.reason);

    const decision: TensorDecisionVerdict["decision"] = allViolations.length === 0 ? "allow" : "block";
    const verdict: TensorDecisionVerdict = {
      decision,
      reasons: allReasons,
      repairedOutput: appendRepairHints(result.repairedOutput ?? input.output, precheckViolations.map((violation) => violation.code)),
      violatedRules: allViolations.map((violation) => violation.code),
      sliceVersion: slice.version
    };

    this.logger.record({
      requestId: input.requestId,
      entityId: input.entityId,
      verdict,
      simStateRef: input.simStateRef,
      payload: input.output
    });

    const simSignals = asRecord(input.simState);
    const nextSlice = this.adaptation.adapt(slice, {
      safeCompletionScore: decision === "allow" ? 1 : boundedSignal(simSignals.safeCompletionScore, 0),
      violationCount: allViolations.length,
      escalated: decision === "block" && allViolations.some((violation) => violation.severity === "high"),
      userApproval: boundedSignal(simSignals.userApprovalScore, decision === "allow" ? 1 : 0),
      simulationHarmony: boundedSignal(simSignals.simulationHarmonyScore, 0.5),
      narrativeCoherence: boundedSignal(simSignals.narrativeCoherenceScore, 0.5),
      correctionFrequency: boundedSignal(simSignals.correctionFrequency, 0)
    });

    if (nextSlice !== slice) {
      this.registry.hotReload(input.entityId, () => nextSlice);
    }

    return verdict;
  }
}
