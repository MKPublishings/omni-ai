import { readImageGenEnvironment } from '../config/env';
import { getCheckpointConfig } from '../config/models.config';
import { getStylePreset } from '../shared/style-presets';
import type {
  ImageCompositionPreset,
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

function resolveCompositionResolution(
  compositionPreset: ImageCompositionPreset | null | undefined,
): { width: number; height: number } | null {
  if (compositionPreset === 'portrait') {
    return { width: 1024, height: 1536 };
  }

  if (compositionPreset === 'full_body') {
    return { width: 896, height: 1536 };
  }

  if (compositionPreset === 'cinematic') {
    return { width: 1536, height: 1024 };
  }

  return null;
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

  const hasManualResolution = Number.isFinite(input.parameterOverrides?.width) && Number.isFinite(input.parameterOverrides?.height);
  const compositionPreset = input.compositionPreset || (input.anatomyStrictMode ? 'full_body' : null);
  const compositionResolution = resolveCompositionResolution(compositionPreset);

  const baseResolution = hasManualResolution
    ? bucketResolution(
      input.parameterOverrides?.width || stylePreset.defaultResolution.width || checkpoint.defaultResolution.width,
      input.parameterOverrides?.height || stylePreset.defaultResolution.height || checkpoint.defaultResolution.height,
    )
    : compositionResolution || bucketResolution(
      stylePreset.defaultResolution.width || checkpoint.defaultResolution.width,
      stylePreset.defaultResolution.height || checkpoint.defaultResolution.height,
    );

  const baseSteps = Number(input.parameterOverrides?.steps) || stylePreset.steps || checkpoint.recommendedSteps || env.defaultSteps;
  const baseCfgScale = Number(input.parameterOverrides?.cfgScale)
    || stylePreset.cfgScale
    || checkpoint.recommendedCfgScale
    || env.defaultCfg;

  const tunedSteps = input.anatomyStrictMode ? Math.max(baseSteps, 30) : baseSteps;
  const tunedCfgScale = input.anatomyStrictMode
    ? Math.max(5, Math.min(baseCfgScale, 6.5))
    : baseCfgScale;

  return {
    width: Number(input.parameterOverrides?.width) || baseResolution.width,
    height: Number(input.parameterOverrides?.height) || baseResolution.height,
    steps: tunedSteps,
    cfgScale: tunedCfgScale,
    cfgRescale: Number(input.parameterOverrides?.cfgRescale) || checkpoint.recommendedCfgRescale || env.defaultCfgRescale,
    sampler: input.parameterOverrides?.sampler || stylePreset.sampler || checkpoint.recommendedSampler || env.defaultSampler,
    scheduler: input.parameterOverrides?.scheduler || checkpoint.recommendedScheduler || env.defaultScheduler,
    seed: seeded,
    batchSize: Number(input.parameterOverrides?.batchSize) || 1,
  };
}