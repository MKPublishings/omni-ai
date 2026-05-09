import type { CheckpointConfig } from '../shared/types';
import { readImageGenEnvironment } from './env';

export const CHECKPOINT_REGISTRY: Record<string, CheckpointConfig> = {
  'ComfyUI-Ion-RTX-v1.0.safetensors': {
    id: 'ComfyUI-Ion-RTX-v1.0.safetensors',
    displayName: 'ComfyUI Ion RTX v1.0',
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
  'noobai-xl-vpred-v1.0': {
    id: 'noobai-xl-vpred-v1.0',
    displayName: 'NoobAI-XL v-pred 1.0',
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
  return CHECKPOINT_REGISTRY[checkpointId] || CHECKPOINT_REGISTRY[env.defaultCheckpoint];
}

export function listCheckpointConfigs(): CheckpointConfig[] {
  return Object.values(CHECKPOINT_REGISTRY);
}