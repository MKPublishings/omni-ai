import { TensorSlice } from "./tensorSlice.ts";

export interface TensorAdaptationSignal {
  safeCompletionScore: number;
  violationCount: number;
  escalated: boolean;
  userApproval?: number;
  simulationHarmony?: number;
  narrativeCoherence?: number;
  correctionFrequency?: number;
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
    const basePressure = (1 - signal.safeCompletionScore) + signal.violationCount * 0.12;
    const approvalPressure = 1 - clamp(signal.userApproval ?? signal.safeCompletionScore, 0, 1);
    const harmonyPressure = 1 - clamp(signal.simulationHarmony ?? 0.5, 0, 1);
    const coherencePressure = 1 - clamp(signal.narrativeCoherence ?? 0.5, 0, 1);
    const correctionPressure = clamp(signal.correctionFrequency ?? 0, 0, 1);
    const pressure = clamp(basePressure + approvalPressure * 0.3 + harmonyPressure * 0.22 + coherencePressure * 0.22 + correctionPressure * 0.28, 0, 2.2);
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
