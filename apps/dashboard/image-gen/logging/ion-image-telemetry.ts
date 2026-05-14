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
  gateway: 'mock' | 'ion' | null;
  checkpoint: string;
  styleFamily: StyleFamilyId;
  artifactCount: number;
  postProcessingMs: number;
  totalMs: number;
  promptAnalytics: IonImagePromptAnalytics;
  error: ImageGenerationError | null;
}

type IonImageGenerationLogEmitter = (log: IonImageGenerationLog) => void;

let telemetryEmitter: IonImageGenerationLogEmitter | null = null;

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

export function setIonImageGenerationLogEmitter(emitter: IonImageGenerationLogEmitter | null): void {
  telemetryEmitter = emitter;
}

export function emitIonImageGenerationLog(log: IonImageGenerationLog): void {
  if (telemetryEmitter) {
    telemetryEmitter(log);
    return;
  }

  if (typeof console === 'undefined' || typeof console.info !== 'function') {
    return;
  }

  console.info(`[ION IMAGE] ${JSON.stringify(log)}`);
}