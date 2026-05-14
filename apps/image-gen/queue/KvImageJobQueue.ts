import { getImageGenerationError } from '../shared/error-codes';
import type {
  GenerationRequest,
  GenerationResponse,
  IImageJobQueue,
  ImageGenerationError,
  ImageJobStatus,
  ImageQueueJobRecord,
} from '../shared/types';

interface KvLike {
  get(key: string, type?: string): Promise<unknown> | unknown;
  put(key: string, value: string): Promise<void> | void;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function readJson<T>(kv: KvLike, key: string, fallback: T): Promise<T> {
  const value = await kv.get(key, 'json');
  if (value === null || value === undefined) {
    return fallback;
  }

  return value as T;
}

async function writeJson(kv: KvLike, key: string, value: unknown): Promise<void> {
  await kv.put(key, JSON.stringify(value));
}

export class KvImageJobQueue implements IImageJobQueue {
  private readonly indexKey: string;
  private readonly maxQueueSize: number;

  constructor(
    private readonly kv: KvLike,
    options?: { namespace?: string; maxQueueSize?: number },
  ) {
    const namespace = String(options?.namespace || 'ion:image:queue').trim() || 'ion:image:queue';
    this.indexKey = `${namespace}:index`;
    this.maxQueueSize = Math.max(1, Number(options?.maxQueueSize || 100));
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

    const jobIds = await this.readIndex();
    jobIds.push(record.jobId);

    await Promise.all([
      writeJson(this.kv, this.jobKey(record.jobId), record),
      writeJson(this.kv, this.indexKey, jobIds),
    ]);

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
    return readJson<ImageQueueJobRecord | null>(this.kv, this.jobKey(jobId), null);
  }

  async listJobs(status?: ImageJobStatus): Promise<ImageQueueJobRecord[]> {
    const jobIds = await this.readIndex();
    const jobs = await Promise.all(jobIds.map((jobId) => this.getJob(jobId)));
    const present = jobs.filter((job): job is ImageQueueJobRecord => Boolean(job));
    return status ? present.filter((job) => job.status === status) : present;
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

  private async update(jobId: string, mapper: (current: ImageQueueJobRecord) => ImageQueueJobRecord): Promise<ImageQueueJobRecord> {
    const current = await this.getJob(jobId);
    if (!current) {
      throw new Error(`Unknown image job id: ${jobId}`);
    }

    const updated = mapper(current);
    await writeJson(this.kv, this.jobKey(jobId), updated);
    return updated;
  }

  private async readIndex(): Promise<string[]> {
    return readJson<string[]>(this.kv, this.indexKey, []);
  }

  private jobKey(jobId: string): string {
    return `${this.indexKey}:job:${jobId}`;
  }

  private toQueueError(error: ImageGenerationError): Error {
    const queueError = new Error(error.message);
    queueError.name = error.code;
    return queueError;
  }
}