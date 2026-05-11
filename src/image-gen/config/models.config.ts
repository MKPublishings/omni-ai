import type { CheckpointConfig } from '../shared/types';
import { readImageGenEnvironment } from './env';

export const CHECKPOINT_REGISTRY: Record<string, CheckpointConfig> = {
  'sd_xl_turbo_1.0_fp16.safetensors': {
    id: 'sd_xl_turbo_1.0_fp16.safetensors',
    displayName: 'SDXL Turbo 1.0 FP16',
    runtimeCheckpoint: 'sd_xl_turbo_1.0_fp16.safetensors',
    baseModelFamily: 'sdxl',
    predictionType: 'epsilon',
    vae: 'sdxl_vae.safetensors',
    qualityTags: ['high detail', 'sharp focus'],
    recommendedSampler: 'dpmpp_2m_sde_heun',
    recommendedScheduler: 'karras',
    recommendedCfgScale: 7.5,
    recommendedSteps: 23,
    clipSkip: 2,
    defaultResolution: { width: 1024, height: 1536 },
  },
  'ion-citizen-xl-vpred-v2.0': {
    id: 'ion-citizen-xl-vpred-v2.0',
    displayName: 'ION Citizen XL v-pred 2.0',
    runtimeCheckpoint: 'ion-citizen-xl-vpred-v2.0',
    baseModelFamily: 'illustrious-xl',
    predictionType: 'v_prediction',
    vae: 'sdxl-vae-fp16-fix',
    qualityTags: ['masterpiece', 'best quality', 'absurdres'],
    recommendedSampler: 'euler',
    recommendedScheduler: 'normal',
    recommendedCfgScale: 5,
    recommendedCfgRescale: 0.2,
    recommendedSteps: 28,
    clipSkip: 2,
    defaultResolution: { width: 1024, height: 1536 },
  },
  'animaginexl-4.0': {
    id: 'animaginexl-4.0',
    displayName: 'AnimagineXL 4.0',
    baseModelFamily: 'illustrious-xl',
    predictionType: 'epsilon',
    vae: 'sdxl-vae-fp16-fix',
    qualityTags: ['masterpiece', 'high score', 'great score', 'absurdres'],
    recommendedSampler: 'euler',
    recommendedScheduler: 'normal',
    recommendedCfgScale: 5.5,
    recommendedSteps: 28,
    clipSkip: 2,
    defaultResolution: { width: 1024, height: 1536 },
  },
  'wai-illustrious-sdxl': {
    id: 'wai-illustrious-sdxl',
    displayName: 'WAI-Illustrious-SDXL',
    baseModelFamily: 'illustrious-xl',
    predictionType: 'epsilon',
    vae: 'sdxl-vae-fp16-fix',
    qualityTags: ['masterpiece', 'best quality', 'absurdres'],
    recommendedSampler: 'euler',
    recommendedScheduler: 'normal',
    recommendedCfgScale: 5.5,
    recommendedSteps: 28,
    clipSkip: 2,
    defaultResolution: { width: 1024, height: 1536 },
  },
  'pony-diffusion-v6-xl': {
    id: 'pony-diffusion-v6-xl',
    displayName: 'Pony Diffusion V6 XL',
    baseModelFamily: 'pony-xl',
    predictionType: 'epsilon',
    vae: 'sdxl-vae-fp16-fix',
    qualityTags: ['score_9', 'score_8_up', 'score_7_up'],
    sourceTag: 'source_anime',
    recommendedSampler: 'euler',
    recommendedScheduler: 'normal',
    recommendedCfgScale: 5.5,
    recommendedSteps: 28,
    clipSkip: 2,
    defaultResolution: { width: 1024, height: 1536 },
  },
};

export function getCheckpointConfig(checkpointId: string): CheckpointConfig {
  const env = readImageGenEnvironment();
  return (
    CHECKPOINT_REGISTRY[checkpointId]
    || CHECKPOINT_REGISTRY[env.defaultCheckpoint]
    || CHECKPOINT_REGISTRY['sd_xl_turbo_1.0_fp16.safetensors']
    || Object.values(CHECKPOINT_REGISTRY)[0]
  );
}

export function listCheckpointConfigs(): CheckpointConfig[] {
  return Object.values(CHECKPOINT_REGISTRY);
}