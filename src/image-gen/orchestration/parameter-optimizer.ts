import { readImageGenEnvironment } from '../config/env';
import { getCheckpointConfig } from '../config/models.config';
import { getStylePreset } from '../shared/style-presets';
import type {
  GenerationModelConfig,
  GenerationParameters,
  StyleFamilyId,
  UserInput,
} from '../shared/types';

function bucketResolution(width: number, height: number): { width: number; height: number } {
  const portrait = [
    { width: 1024, height: 1536 },
    { width: 768, height: 1024 },
  ];
  const landscape = [
    { width: 1536, height: 1024 },
    { width: 1024, height: 768 },
  ];
  const square = [{ width: 1024, height: 1024 }];

  const candidates = width === height ? square : width > height ? landscape : portrait;
  return candidates[0];
}

export function optimizeModelConfig(checkpointId: string, input: UserInput): GenerationModelConfig {
  const checkpoint = getCheckpointConfig(checkpointId);

  return {
    checkpoint: checkpoint.id,
    predictionType: checkpoint.predictionType,
    vae: checkpoint.vae,
    loras: input.loras || [],
    clipSkip: checkpoint.clipSkip,
  };
}

export function optimizeParameters(
  styleFamily: StyleFamilyId,
  checkpointId: string,
  input: UserInput,
): GenerationParameters {
  const env = readImageGenEnvironment();
  const stylePreset = getStylePreset(styleFamily);
  const checkpoint = getCheckpointConfig(checkpointId);

  const seeded = Number.isFinite(input.parameterOverrides?.seed)
    ? Number(input.parameterOverrides?.seed)
    : Math.floor(Math.random() * 2_147_483_647);

  const baseResolution = bucketResolution(
    input.parameterOverrides?.width || stylePreset.defaultResolution.width || checkpoint.defaultResolution.width,
    input.parameterOverrides?.height || stylePreset.defaultResolution.height || checkpoint.defaultResolution.height,
  );

  return {
    width: Number(input.parameterOverrides?.width) || baseResolution.width,
    height: Number(input.parameterOverrides?.height) || baseResolution.height,
    steps: Number(input.parameterOverrides?.steps) || stylePreset.steps || checkpoint.recommendedSteps || env.defaultSteps,
    cfgScale: Number(input.parameterOverrides?.cfgScale) || stylePreset.cfgScale || checkpoint.recommendedCfgScale || env.defaultCfg,
    cfgRescale: Number(input.parameterOverrides?.cfgRescale) || checkpoint.recommendedCfgRescale || env.defaultCfgRescale,
    sampler: input.parameterOverrides?.sampler || stylePreset.sampler || checkpoint.recommendedSampler || env.defaultSampler,
    scheduler: input.parameterOverrides?.scheduler || checkpoint.recommendedScheduler || env.defaultScheduler,
    seed: seeded,
    batchSize: Number(input.parameterOverrides?.batchSize) || 1,
  };
}