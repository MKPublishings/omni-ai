import { LineageLogger } from "../metadata/lineageLogger.ts";
import { TensorDecisionVerdict } from "../metadata/footprintModel.ts";
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

    const result = this.validator.validate({
      slice,
      output: input.output,
      simState: input.simState
    });

    const decision: TensorDecisionVerdict["decision"] = result.violations.length === 0 ? "allow" : "block";
    const verdict: TensorDecisionVerdict = {
      decision,
      reasons: result.reasons,
      repairedOutput: result.repairedOutput,
      violatedRules: result.violations.map((violation) => violation.code),
      sliceVersion: slice.version
    };

    this.logger.record({
      requestId: input.requestId,
      entityId: input.entityId,
      verdict,
      simStateRef: input.simStateRef,
      payload: input.output
    });

    const nextSlice = this.adaptation.adapt(slice, {
      safeCompletionScore: decision === "allow" ? 1 : 0,
      violationCount: result.violations.length,
      escalated: decision === "block" && result.violations.some((violation) => violation.severity === "high")
    });

    if (nextSlice !== slice) {
      this.registry.hotReload(input.entityId, () => nextSlice);
    }

    return verdict;
  }
}
