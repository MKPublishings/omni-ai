import { TensorSlice } from "./tensorSlice.ts";

export interface TensorAdaptationSignal {
  safeCompletionScore: number;
  violationCount: number;
  escalated: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class TensorAdaptationEngine {
  adapt(slice: TensorSlice, signal: TensorAdaptationSignal): TensorSlice {
    if (!slice.adaptation.enabled) {
      return slice;
    }

    const learningRate = slice.adaptation.learningRate;
    const pressure = clamp((1 - signal.safeCompletionScore) + signal.violationCount * 0.12, 0, 1.5);
    const escalationBoost = signal.escalated ? 0.08 : 0;

    const strictnessDelta = learningRate * (pressure + escalationBoost - 0.35);
    const min = slice.adaptation.minStrictness;
    const max = slice.adaptation.maxStrictness;

    return {
      ...slice,
      constraints: {
        ...slice.constraints,
        narrativeStrictness: clamp(slice.constraints.narrativeStrictness + strictnessDelta, min, max),
        physicsStrictness: clamp(slice.constraints.physicsStrictness + strictnessDelta, min, max)
      }
    };
  }
}
