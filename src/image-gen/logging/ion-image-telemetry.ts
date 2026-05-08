import type {
  ImageGenerationError,
  IonImageGenerationLog,
  IonImagePromptAnalytics,
  StyleFamilyId,
} from '../shared/types';

interface CreateIonImageGenerationLogInput {
  requestId: string;
  jobId: string;
  promptId: string | null;
  status: 'completed' | 'failed';
  gateway: 'mock' | 'comfyui' | null;
  checkpoint: string;
  styleFamily: StyleFamilyId;
  artifactCount: number;
  postProcessingMs: number;
  totalMs: number;
  promptAnalytics: IonImagePromptAnalytics;
  error: ImageGenerationError | null;
}

export function createIonImageGenerationLog(input: CreateIonImageGenerationLogInput): IonImageGenerationLog {
  return {
    event: input.status === 'completed' ? 'ion.image.job.completed' : 'ion.image.job.failed',
    requestId: input.requestId,
    jobId: input.jobId,
    promptId: input.promptId,
    status: input.status,
    gateway: input.gateway,
    checkpoint: input.checkpoint,
    styleFamily: input.styleFamily,
    artifactCount: input.artifactCount,
    postProcessingMs: input.postProcessingMs,
    totalMs: input.totalMs,
    errorCode: input.error?.code || null,
    promptAnalytics: input.promptAnalytics,
  };
}

export function emitIonImageGenerationLog(log: IonImageGenerationLog): void {
  if (typeof console === 'undefined' || typeof console.info !== 'function') {
    return;
  }

  console.info(`[ION IMAGE] ${JSON.stringify(log)}`);
}