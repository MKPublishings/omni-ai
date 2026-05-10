export type TensorRiskClass = "low" | "medium" | "high" | "critical";

export type TensorModality = "text" | "dialogue" | "image" | "video" | "audio" | "tool";

export interface TensorConstraints {
  maxConcurrentJobs: number;
  allowedModalities: TensorModality[];
  narrativeStrictness: number;
  physicsStrictness: number;
  varianceBoost?: number;
  escalationPolicyId: string;
}

export interface TensorAdaptationPolicy {
  enabled: boolean;
  learningRate: number;
  minStrictness: number;
  maxStrictness: number;
}

export interface TensorSlice {
  entityId: string;
  riskClass: TensorRiskClass;
  constraints: TensorConstraints;
  version: number;
  createdAt: string;
  updatedAt: string;
  adaptation: TensorAdaptationPolicy;
}

export interface TensorSliceInput {
  entityId: string;
  riskClass: TensorRiskClass;
  constraints: TensorConstraints;
  adaptation?: Partial<TensorAdaptationPolicy>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeStrictness(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }
  return clamp(value, 0, 1);
}

export function createTensorSlice(input: TensorSliceInput): TensorSlice {
  const now = new Date().toISOString();
  const varianceBoost = normalizeStrictness(input.constraints.varianceBoost ?? 0.5);

  return {
    entityId: input.entityId,
    riskClass: input.riskClass,
    constraints: {
      ...input.constraints,
      maxConcurrentJobs: Math.max(1, Math.floor(input.constraints.maxConcurrentJobs)),
      narrativeStrictness: normalizeStrictness(input.constraints.narrativeStrictness),
      physicsStrictness: normalizeStrictness(input.constraints.physicsStrictness),
      varianceBoost,
    },
    version: 1,
    createdAt: now,
    updatedAt: now,
    adaptation: {
      enabled: input.adaptation?.enabled ?? true,
      learningRate: clamp(input.adaptation?.learningRate ?? 0.08, 0.01, 0.5),
      minStrictness: clamp(input.adaptation?.minStrictness ?? 0.1, 0, 1),
      maxStrictness: clamp(input.adaptation?.maxStrictness ?? 0.95, 0, 1)
    }
  };
}

export function bumpSliceVersion(slice: TensorSlice): TensorSlice {
  return {
    ...slice,
    version: slice.version + 1,
    updatedAt: new Date().toISOString()
  };
}
