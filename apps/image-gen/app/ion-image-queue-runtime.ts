import type {
  IImageArtifactStorage,
  IImageJobQueue,
  IonImageQueueMetadataPayload,
  IonImageQueueJobStatus,
} from '../shared/types';
import type { IonImagePipelineInput } from './ion-image-pipeline';
import { buildIonImageGenerationRequest } from './ion-image-pipeline';
import { runNextIonImageJob } from './ion-image-job-runner';
import { InMemoryImageJobQueue } from '../queue/InMemoryImageJobQueue';
import { KvImageJobQueue } from '../queue/KvImageJobQueue';
import { InMemoryImageArtifactStorage } from '../storage/InMemoryImageArtifactStorage';
import { KvImageArtifactStorage } from '../storage/KvImageArtifactStorage';
import { readImageGenEnvironment } from '../config/env';

type EnvironmentSource = Record<string, unknown>;

interface KvLike {
  get(key: string, type?: string): Promise<unknown> | unknown;
  put(key: string, value: string): Promise<void> | void;
}

interface IonImageQueueRuntime {
  queue: IImageJobQueue;
  storage: IImageArtifactStorage;
}

let runtimeSingleton: IonImageQueueRuntime | null = null;

function isKvLike(value: unknown): value is KvLike {
  return Boolean(value) && typeof (value as KvLike).get === 'function' && typeof (value as KvLike).put === 'function';
}

function resolveRuntimeKv(source?: EnvironmentSource): KvLike | null {
  if (!source) {
    return null;
  }

  const env = readImageGenEnvironment(source);
  if (env.queueRuntime !== 'kv') {
    return null;
  }

  const configuredBinding = String(env.queueStateBinding || '').trim();
  if (!configuredBinding) {
    return null;
  }

  const candidate = source[configuredBinding];
  return isKvLike(candidate) ? candidate : null;
}

function getRuntime(source?: EnvironmentSource): IonImageQueueRuntime {
  if (!runtimeSingleton) {
    const kv = resolveRuntimeKv(source);
    const env = readImageGenEnvironment(source);
    runtimeSingleton = kv
      ? {
          queue: new KvImageJobQueue(kv, {
            maxQueueSize: env.maxQueueSize,
            namespace: env.queueStateNamespace,
          }),
          storage: new KvImageArtifactStorage(kv, {
            namespace: `${env.queueStateNamespace}:storage`,
            imageStoragePath: env.imageStoragePath,
            thumbnailStoragePath: env.thumbnailStoragePath,
            metadataDbUrl: env.metadataDbUrl,
          }),
        }
      : {
          queue: new InMemoryImageJobQueue(source),
          storage: new InMemoryImageArtifactStorage(source),
        };
  }

  return runtimeSingleton;
}

export function resetIonImageQueueRuntime(): void {
  runtimeSingleton = null;
}

export async function submitIonImageJob(input: IonImagePipelineInput, source?: EnvironmentSource) {
  const runtime = getRuntime(source);
  const request = await buildIonImageGenerationRequest(input, source);
  return runtime.queue.enqueue(request);
}

export async function runNextQueuedIonImageJob(source?: EnvironmentSource) {
  const runtime = getRuntime(source);
  return runNextIonImageJob(runtime.queue, runtime.storage, source);
}

export async function getIonImageJobStatus(jobId: string, source?: EnvironmentSource): Promise<IonImageQueueJobStatus> {
  const runtime = getRuntime(source);
  const job = await runtime.queue.getJob(jobId);
  if (!job) {
    return {
      job: null,
      artifacts: [],
      metadata: null,
    };
  }

  const [artifacts, metadata] = await Promise.all([
    runtime.storage.getImages(jobId),
    runtime.storage.getMetadata<IonImageQueueMetadataPayload>(jobId),
  ]);

  return {
    job,
    artifacts,
    metadata,
  };
}