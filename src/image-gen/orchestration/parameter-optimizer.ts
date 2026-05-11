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
    { width: 896, height: 1344 },
    { width: 768, height: 1152 },
  ];
  const landscape = [
    { width: 1344, height: 896 },
    { width: 1152, height: 768 },
  ];
  const square = [{ width: 1024, height: 1024 }, { width: 896, height: 896 }];

  const candidates = width === height ? square : width > height ? landscape : portrait;
  return candidates[0];
}

function resolveCompositionResolution(
  compositionPreset: ImageCompositionPreset | null | undefined,
): { width: number; height: number } | null {
  if (compositionPreset === 'portrait') {
    return { width: 896, height: 1344 };
  }

  if (compositionPreset === 'full_body') {
    return { width: 832, height: 1344 };
  }

  if (compositionPreset === 'cinematic') {
    return { width: 1344, height: 896 };
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

  const baseSteps = Number(input.parameterOverrides?.steps) || env.defaultSteps || stylePreset.steps || checkpoint.recommendedSteps;
  const baseCfgScale = Number(input.parameterOverrides?.cfgScale)
    || env.defaultCfg
    || stylePreset.cfgScale
    || checkpoint.recommendedCfgScale
    ;

  const tunedSteps = input.anatomyStrictMode ? Math.max(baseSteps, 22) : baseSteps;
  const tunedCfgScale = input.anatomyStrictMode
    ? Math.max(5, Math.min(baseCfgScale, 6.5))
    : baseCfgScale;

  const clampedSteps = Math.max(12, Math.min(tunedSteps, 24));

  return {
    width: Number(input.parameterOverrides?.width) || baseResolution.width,
    height: Number(input.parameterOverrides?.height) || baseResolution.height,
    steps: clampedSteps,
    cfgScale: tunedCfgScale,
    cfgRescale: Number(input.parameterOverrides?.cfgRescale) || checkpoint.recommendedCfgRescale || env.defaultCfgRescale,
    denoise: Number.isFinite(Number(input.parameterOverrides?.denoise))
      ? Number(input.parameterOverrides?.denoise)
      : env.defaultDenoise,
    sampler: input.parameterOverrides?.sampler || env.defaultSampler || stylePreset.sampler || checkpoint.recommendedSampler,
    scheduler: input.parameterOverrides?.scheduler || env.defaultScheduler || checkpoint.recommendedScheduler,
    seed: seeded,
    batchSize: Number(input.parameterOverrides?.batchSize) || 1,
  };
}