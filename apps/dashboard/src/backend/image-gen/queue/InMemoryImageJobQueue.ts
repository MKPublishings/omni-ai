import { readImageGenEnvironment } from '../config/env';
import { getImageGenerationError } from '../shared/error-codes';
import type {
  GenerationRequest,
  GenerationResponse,
  IImageJobQueue,
  ImageGenerationError,
  ImageJobStatus,
  ImageQueueJobRecord,
} from '../shared/types';

type EnvironmentSource = Record<string, unknown>;

function nowIso(): string {
  return new Date().toISOString();
}

export class InMemoryImageJobQueue implements IImageJobQueue {
  private readonly jobs = new Map<string, ImageQueueJobRecord>();
  private readonly maxQueueSize: number;

  constructor(source?: EnvironmentSource) {
    this.maxQueueSize = readImageGenEnvironment(source).maxQueueSize;
  }

  async enqueue(request: GenerationRequest, options?: { maxAttempts?: number }): Promise<ImageQueueJobRecord> {
    const queuedJobs = await this.listJobs('queued');
    if (queuedJobs.length >= this.maxQueueSize) {
      throw this.toQueueError(getImageGenerationError('E_QUEUE_FULL'));
    }

    const createdAt = nowIso();
    const record: ImageQueueJobRecord = {
      jobId: `job-${crypto.randomUUID()}`,
      requestId: request.requestId,
      promptId: null,
      status: 'queued',
      priority: request.priority,
      createdAt,
      updatedAt: createdAt,
      attempts: 0,
      maxAttempts: options?.maxAttempts ?? 3,
      request,
      response: null,
      error: null,
    };

    this.jobs.set(record.jobId, record);
    return record;
  }

  async dequeueNext(): Promise<ImageQueueJobRecord | null> {
    const queued = await this.listJobs('queued');
    const next = queued.sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0] || null;
    if (!next) {
      return null;
    }

    return this.markProcessing(next.jobId);
  }

  async getJob(jobId: string): Promise<ImageQueueJobRecord | null> {
    return this.jobs.get(jobId) || null;
  }

  async listJobs(status?: ImageJobStatus): Promise<ImageQueueJobRecord[]> {
    const all = [...this.jobs.values()];
    return status ? all.filter((job) => job.status === status) : all;
  }

  async markProcessing(jobId: string, promptId?: string | null): Promise<ImageQueueJobRecord> {
    return this.update(jobId, (current) => ({
      ...current,
      status: 'processing',
      promptId: promptId ?? current.promptId,
      attempts: current.status === 'processing' ? current.attempts : current.attempts + 1,
      updatedAt: nowIso(),
    }));
  }

  async markCompleted(jobId: string, response: GenerationResponse): Promise<ImageQueueJobRecord> {
    return this.update(jobId, (current) => ({
      ...current,
      status: 'completed',
      response,
      error: null,
      updatedAt: nowIso(),
    }));
  }

  async markFailed(jobId: string, error: ImageGenerationError): Promise<ImageQueueJobRecord> {
    return this.update(jobId, (current) => ({
      ...current,
      status: 'failed',
      error,
      updatedAt: nowIso(),
    }));
  }

  private update(jobId: string, mapper: (current: ImageQueueJobRecord) => ImageQueueJobRecord): ImageQueueJobRecord {
    const current = this.jobs.get(jobId);
    if (!current) {
      throw new Error(`Unknown image job id: ${jobId}`);
    }

    const updated = mapper(current);
    this.jobs.set(jobId, updated);
    return updated;
  }

  private toQueueError(error: ImageGenerationError): Error {
    const queueError = new Error(error.message);
    queueError.name = error.code;
    return queueError;
  }
}