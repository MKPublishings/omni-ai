import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../../index.ts';
import { resetIonImageQueueRuntime } from '../../image-gen/app/ion-image-queue-runtime.ts';

class MemoryNamespace {
  store = new Map<string, string>();

  async get(key: string, type?: string): Promise<any> {
    const value = this.store.get(key);
    if (value === undefined) return null;
    if (type === 'json') return JSON.parse(value);
    return value;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
}

function createExecutionContext() {
  const pending: Promise<unknown>[] = [];
  return {
    waitUntil(promise: Promise<unknown>) {
      pending.push(promise);
    },
    passThroughOnException() {
      return;
    },
    async flush() {
      await Promise.all(pending.splice(0, pending.length));
    }
  };
}

test('worker /api/image queue seam submits jobs and exposes status without replacing sync behavior', async () => {
  resetIonImageQueueRuntime();
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();
  const env = {
    AI: {
      run: async () => ({ image: new Uint8Array([137, 80, 78, 71]) }),
    },
    MEMORY: memory as any,
    MIND: mind as any,
    ASSETS: {
      fetch: async () => new Response('not-found', { status: 404 }),
    },
    ION_IMAGE_QUEUE_V1: '1',
    ion_MOCK: 'true',
    DEFAULT_CHECKPOINT: 'ion-citizen-xl-vpred-v2.0',
    IMAGE_STORAGE_PATH: './tmp/images',
    THUMBNAIL_STORAGE_PATH: './tmp/thumbs',
    METADATA_DB_URL: 'memory://image-meta',
  } as any;

  const ctx = createExecutionContext();
  const submitRequest = new Request('https://example.test/api/image?queue=v1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: 'usr_test',
      prompt: 'Draw a cozy girl studying by the window with warm evening light.',
      stylePack: 'lofi',
      width: 1536,
      height: 1024,
      seed: 42,
    }),
  });

  const submitResponse = await worker.fetch(submitRequest, env, ctx as any);
  const submitBody = await submitResponse.json() as Record<string, any>;

  assert.equal(submitResponse.status, 202);
  assert.equal(submitBody.queued, true);
  assert.match(String(submitBody.jobId || ''), /^job-/);
  assert.equal(submitBody.status, 'queued');
  assert.match(String(submitBody.statusUrl || ''), /^\/api\/image\?queue=v1&jobId=/);

  await ctx.flush();

  const statusRequest = new Request(`https://example.test${submitBody.statusUrl}`, {
    method: 'GET',
  });
  const statusResponse = await worker.fetch(statusRequest, env, createExecutionContext() as any);
  const statusBody = await statusResponse.json() as Record<string, any>;

  assert.equal(statusResponse.status, 200);
  assert.equal(statusBody.jobId, submitBody.jobId);
  assert.equal(statusBody.status, 'completed');
  assert.equal(statusBody.promptId.startsWith('mock-'), true);
  assert.equal(statusBody.response?.modelInfo?.checkpoint, 'ion-citizen-xl-vpred-v2.0');
  assert.equal(Array.isArray(statusBody.artifacts), true);
  assert.equal(statusBody.artifacts.length, 2);
  assert.equal(statusBody.metadata?.payload?.styleFamily, 'lofi_aesthetic');
  assert.ok(statusBody.updatedAt);
});