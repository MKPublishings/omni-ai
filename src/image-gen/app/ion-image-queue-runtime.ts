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
import { InMemoryImageArtifactStorage } from '../storage/InMemoryImageArtifactStorage';

type EnvironmentSource = Record<string, unknown>;

interface IonImageQueueRuntime {
  queue: IImageJobQueue;
  storage: IImageArtifactStorage;
}

let runtimeSingleton: IonImageQueueRuntime | null = null;

function getRuntime(source?: EnvironmentSource): IonImageQueueRuntime {
  if (!runtimeSingleton) {
    runtimeSingleton = {
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