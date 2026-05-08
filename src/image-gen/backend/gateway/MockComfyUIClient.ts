import type {
  ComfyUIWorkflow,
  IModelGateway,
  JobStatus,
  ProgressEvent,
} from '../../shared/types';
import { readImageGenEnvironment } from '../../config/env';

interface MockJobRecord {
  promptId: string;
  createdAt: number;
  totalSteps: number;
}

const MOCK_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlH0uoAAAAASUVORK5CYII=';

export class MockComfyUIClient implements IModelGateway {
  private readonly jobs = new Map<string, MockJobRecord>();

  async submitWorkflow(_workflow: ComfyUIWorkflow): Promise<{ promptId: string }> {
    const promptId = `mock-${crypto.randomUUID()}`;

    this.jobs.set(promptId, {
      promptId,
      createdAt: Date.now(),
      totalSteps: readImageGenEnvironment().defaultSteps,
    });

    return { promptId };
  }

  async getJobStatus(promptId: string): Promise<JobStatus> {
    const job = this.getJob(promptId);
    const elapsedMs = Date.now() - job.createdAt;
    const completed = elapsedMs >= 100;

    return {
      promptId,
      status: completed ? 'completed' : 'processing',
      queuePosition: completed ? 0 : 1,
      step: completed ? job.totalSteps : Math.min(job.totalSteps - 1, Math.max(1, Math.floor(job.totalSteps / 2))),
      totalSteps: job.totalSteps,
    };
  }

  async getOutputImage(promptId: string): Promise<Uint8Array> {
    this.getJob(promptId);
    return Uint8Array.from(Buffer.from(MOCK_IMAGE_BASE64, 'base64'));
  }

  async *getProgress(promptId: string): AsyncIterable<ProgressEvent> {
    const job = this.getJob(promptId);

    yield {
      promptId,
      status: 'queued',
      step: 0,
      totalSteps: job.totalSteps,
      queuePosition: 1,
    };

    yield {
      promptId,
      status: 'processing',
      step: Math.max(1, Math.floor(job.totalSteps / 2)),
      totalSteps: job.totalSteps,
      queuePosition: 0,
    };

    yield {
      promptId,
      status: 'completed',
      step: job.totalSteps,
      totalSteps: job.totalSteps,
      queuePosition: 0,
      previewImageUrl: 'mock://preview/final',
    };
  }

  async getLoadedModel(): Promise<string | null> {
    return readImageGenEnvironment().defaultCheckpoint;
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  private getJob(promptId: string): MockJobRecord {
    const job = this.jobs.get(promptId);
    if (!job) {
      throw new Error(`Unknown mock prompt id: ${promptId}`);
    }

    return job;
  }
}