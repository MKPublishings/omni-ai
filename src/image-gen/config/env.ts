import type {
  ImagePredictionType,
  ImageSampler,
  ImageScheduler,
} from '../shared/types';

type EnvironmentSource = Record<string, unknown>;

export interface ImageGenEnvironment {
  comfyuiHost: string;
  comfyuiWs: string;
  comfyuiMock: boolean;
  comfyuiRequestTimeoutMs: number;
  defaultCheckpoint: string;
  defaultPredictionType: ImagePredictionType;
  defaultVae: string;
  defaultSampler: ImageSampler;
  defaultScheduler: ImageScheduler;
  defaultSteps: number;
  defaultCfg: number;
  defaultCfgRescale: number;
  defaultWidth: number;
  defaultHeight: number;
  defaultClipSkip: number;
  maxQueueSize: number;
  maxConcurrentJobs: number;
  jobTimeoutMs: number;
  upscaleJobTimeoutMs: number;
  queueRuntime: 'memory' | 'kv';
  queueStateBinding: string;
  queueStateNamespace: string;
  imageStoragePath: string;
  thumbnailStoragePath: string;
  metadataDbUrl: string;
  safetyEnabled: boolean;
  safetyNsfwThreshold: number;
  rateLimitPerHour: number;
  logLevel: string;
  logFormat: 'json' | 'pretty';
}

function getDefaultEnvironmentSource(): EnvironmentSource {
  if (typeof process !== 'undefined' && process.env) {
    return process.env as EnvironmentSource;
  }

  return {};
}

function readText(source: EnvironmentSource, key: string, fallback: string): string {
  const value = String(source[key] ?? '').trim();
  return value || fallback;
}

function readNumber(source: EnvironmentSource, key: string, fallback: number): number {
  const value = Number(source[key]);
  return Number.isFinite(value) ? value : fallback;
}

function readBoolean(source: EnvironmentSource, key: string, fallback: boolean): boolean {
  const value = String(source[key] ?? '').trim().toLowerCase();
  if (!value) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value);
}

export function readImageGenEnvironment(source: EnvironmentSource = getDefaultEnvironmentSource()): ImageGenEnvironment {
  return {
    comfyuiHost: readText(source, 'COMFYUI_HOST', 'http://localhost:8188'),
    comfyuiWs: readText(source, 'COMFYUI_WS', 'ws://localhost:8188/ws'),
    comfyuiMock: readBoolean(source, 'COMFYUI_MOCK', true),
    comfyuiRequestTimeoutMs: readNumber(source, 'COMFYUI_REQUEST_TIMEOUT_MS', 120000),
    defaultCheckpoint: readText(source, 'DEFAULT_CHECKPOINT', 'noobai-xl-vpred-v1.0'),
    defaultPredictionType: readText(source, 'DEFAULT_PREDICTION_TYPE', 'v_prediction') as ImagePredictionType,
    defaultVae: readText(source, 'DEFAULT_VAE', 'sdxl-vae-fp16-fix'),
    defaultSampler: readText(source, 'DEFAULT_SAMPLER', 'euler') as ImageSampler,
    defaultScheduler: readText(source, 'DEFAULT_SCHEDULER', 'normal') as ImageScheduler,
    defaultSteps: readNumber(source, 'DEFAULT_STEPS', 28),
    defaultCfg: readNumber(source, 'DEFAULT_CFG', 5),
    defaultCfgRescale: readNumber(source, 'DEFAULT_CFG_RESCALE', 0.2),
    defaultWidth: readNumber(source, 'DEFAULT_WIDTH', 1024),
    defaultHeight: readNumber(source, 'DEFAULT_HEIGHT', 1536),
    defaultClipSkip: readNumber(source, 'DEFAULT_CLIP_SKIP', 2),
    maxQueueSize: readNumber(source, 'MAX_QUEUE_SIZE', 100),
    maxConcurrentJobs: readNumber(source, 'MAX_CONCURRENT_JOBS', 2),
    jobTimeoutMs: readNumber(source, 'JOB_TIMEOUT_MS', 120000),
    upscaleJobTimeoutMs: readNumber(source, 'UPSCALE_JOB_TIMEOUT_MS', 300000),
    queueRuntime: readText(source, 'IMAGE_QUEUE_RUNTIME', 'memory') === 'kv' ? 'kv' : 'memory',
    queueStateBinding: readText(source, 'IMAGE_QUEUE_STATE_BINDING', 'ION_IMAGE_STATE_KV'),
    queueStateNamespace: readText(source, 'IMAGE_QUEUE_STATE_NAMESPACE', 'ion:image:queue'),
    imageStoragePath: readText(source, 'IMAGE_STORAGE_PATH', './storage/images'),
    thumbnailStoragePath: readText(source, 'THUMBNAIL_STORAGE_PATH', './storage/thumbs'),
    metadataDbUrl: readText(source, 'METADATA_DB_URL', 'sqlite:./storage/metadata.db'),
    safetyEnabled: readBoolean(source, 'SAFETY_ENABLED', true),
    safetyNsfwThreshold: readNumber(source, 'SAFETY_NSFW_THRESHOLD', 0.7),
    rateLimitPerHour: readNumber(source, 'RATE_LIMIT_PER_HOUR', 30),
    logLevel: readText(source, 'LOG_LEVEL', 'info'),
    logFormat: readText(source, 'LOG_FORMAT', 'json') === 'pretty' ? 'pretty' : 'json',
  };
}