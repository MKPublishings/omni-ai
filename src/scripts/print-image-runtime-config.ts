import { readImageGenEnvironment } from '../image-gen/config/env';

const env = readImageGenEnvironment();

const output = {
  gateway: {
    host: env.comfyuiHost,
    wsUrl: env.comfyuiWs,
    mock: env.comfyuiMock,
    requestTimeoutMs: env.comfyuiRequestTimeoutMs,
    defaultCheckpoint: env.defaultCheckpoint,
  },
  queue: {
    runtime: env.queueRuntime,
    stateBinding: env.queueStateBinding,
    stateNamespace: env.queueStateNamespace,
    maxQueueSize: env.maxQueueSize,
    maxConcurrentJobs: env.maxConcurrentJobs,
  },
  storage: {
    imageStoragePath: env.imageStoragePath,
    thumbnailStoragePath: env.thumbnailStoragePath,
    metadataDbUrl: env.metadataDbUrl,
  },
  safety: {
    enabled: env.safetyEnabled,
    nsfwThreshold: env.safetyNsfwThreshold,
    rateLimitPerHour: env.rateLimitPerHour,
  },
  logging: {
    level: env.logLevel,
    format: env.logFormat,
  },
};

console.log(JSON.stringify(output, null, 2));