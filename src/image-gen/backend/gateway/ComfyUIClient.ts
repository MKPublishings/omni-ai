import { resolveComfyUIConfig } from '../../config/comfyui.config';
import type {
  IModelGateway,
  JobStatus,
  ProgressEvent,
} from '../../shared/types';

interface ComfyUIPromptResponse {
  prompt_id?: string;
}

interface ComfyUIQueueResponse {
  queue_running?: unknown[];
  queue_pending?: unknown[];
}

interface ComfyUIHistoryResponse {
  [promptId: string]: {
    status?: {
      completed?: boolean;
      status_str?: string;
    };
    outputs?: Record<string, {
      images?: Array<{
        filename: string;
        subfolder?: string;
        type?: string;
      }>;
    }>;
  };
}

function normalizeStatus(value: string | undefined): JobStatus['status'] {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.includes('error') || normalized.includes('fail')) {
    return 'failed';
  }
  if (normalized.includes('complete')) {
    return 'completed';
  }
  return 'processing';
}

export class ComfyUIClient implements IModelGateway {
  private readonly config = resolveComfyUIConfig();

  async submitWorkflow(workflow: Record<string, unknown>): Promise<{ promptId: string }> {
    const response = await this.fetchJson<ComfyUIPromptResponse>(this.config.promptPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: workflow }),
    });

    const promptId = String(response.prompt_id || '').trim();
    if (!promptId) {
      throw new Error('ComfyUI did not return a prompt id.');
    }

    return { promptId };
  }

  async getJobStatus(promptId: string): Promise<JobStatus> {
    const [queue, history] = await Promise.all([
      this.fetchJson<ComfyUIQueueResponse>(this.config.queuePath, { method: 'GET' }),
      this.fetchJson<ComfyUIHistoryResponse>(this.config.historyPath(promptId), { method: 'GET' }),
    ]);

    const historyEntry = history[promptId];
    const queuePending = Array.isArray(queue.queue_pending) ? queue.queue_pending : [];
    const queueRunning = Array.isArray(queue.queue_running) ? queue.queue_running : [];
    const queuedIds = [...queueRunning, ...queuePending].map((entry) => {
      if (Array.isArray(entry)) {
        return String(entry[1] ?? '');
      }
      if (entry && typeof entry === 'object') {
        return String((entry as Record<string, unknown>).prompt_id ?? '');
      }
      return '';
    });

    const queuePosition = Math.max(0, queuedIds.indexOf(promptId));
    const completed = Boolean(historyEntry?.status?.completed);

    return {
      promptId,
      status: completed ? 'completed' : normalizeStatus(historyEntry?.status?.status_str),
      queuePosition,
      step: completed ? 1 : 0,
      totalSteps: 1,
    };
  }

  async getOutputImage(promptId: string): Promise<Uint8Array> {
    const history = await this.fetchJson<ComfyUIHistoryResponse>(this.config.historyPath(promptId), { method: 'GET' });
    const historyEntry = history[promptId];

    if (!historyEntry?.outputs) {
      throw new Error(`ComfyUI history for ${promptId} did not include outputs.`);
    }

    for (const output of Object.values(historyEntry.outputs)) {
      const image = output.images?.[0];
      if (!image?.filename) {
        continue;
      }

      const bytes = await this.fetchBytes(this.config.viewPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: image.filename,
          subfolder: image.subfolder || '',
          type: image.type || 'output',
        }),
      });

      return bytes;
    }

    throw new Error(`ComfyUI history for ${promptId} did not include an image output.`);
  }

  async *getProgress(promptId: string): AsyncIterable<ProgressEvent> {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const status = await this.getJobStatus(promptId);
      yield {
        promptId,
        status: status.status,
        step: status.step,
        totalSteps: status.totalSteps,
        queuePosition: status.queuePosition,
      };

      if (status.status === 'completed' || status.status === 'failed') {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(`Timed out while polling ComfyUI progress for ${promptId}.`);
  }

  async getLoadedModel(): Promise<string | null> {
    const queue = await this.fetchJson<ComfyUIQueueResponse>(this.config.queuePath, { method: 'GET' });
    return Array.isArray(queue.queue_running) ? 'unknown' : null;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.fetchJson<ComfyUIQueueResponse>(this.config.queuePath, { method: 'GET' });
      return true;
    } catch {
      return false;
    }
  }

  private async fetchJson<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetchWithTimeout(path, init);
    if (!response.ok) {
      throw new Error(`ComfyUI request failed (${response.status}) for ${path}.`);
    }

    return response.json() as Promise<T>;
  }

  private async fetchBytes(path: string, init: RequestInit): Promise<Uint8Array> {
    const response = await this.fetchWithTimeout(path, init);
    if (!response.ok) {
      throw new Error(`ComfyUI binary request failed (${response.status}) for ${path}.`);
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  private async fetchWithTimeout(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    try {
      return await fetch(`${this.config.host}${path}`, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}