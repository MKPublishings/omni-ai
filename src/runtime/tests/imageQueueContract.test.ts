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
    },
  };
}

function sortedKeys(value: Record<string, unknown>): string[] {
  return Object.keys(value).sort();
}

test('worker /api/image queue seam preserves submission and status response contracts', async () => {
  resetIonImageQueueRuntime();
  const env = {
    AI: {
      run: async () => ({ image: new Uint8Array([137, 80, 78, 71]) }),
    },
    MEMORY: new MemoryNamespace() as any,
    MIND: new MemoryNamespace() as any,
    ASSETS: {
      fetch: async () => new Response('not-found', { status: 404 }),
    },
    ION_IMAGE_QUEUE_V1: '1',
    COMFYUI_MOCK: 'true',
    DEFAULT_CHECKPOINT: 'noobai-xl-vpred-v1.0',
    IMAGE_STORAGE_PATH: './tmp/images',
    THUMBNAIL_STORAGE_PATH: './tmp/thumbs',
    METADATA_DB_URL: 'memory://image-meta',
  } as any;

  const submitCtx = createExecutionContext();
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

  const submitResponse = await worker.fetch(submitRequest, env, submitCtx as any);
  const submitBody = await submitResponse.json() as Record<string, unknown>;

  assert.equal(submitResponse.status, 202);
  assert.deepEqual(sortedKeys(submitBody), ['jobId', 'queued', 'requestId', 'status', 'statusUrl']);
  assert.equal(submitBody.queued, true);
  assert.match(String(submitBody.jobId || ''), /^job-/);
  assert.match(String(submitBody.requestId || ''), /^[-a-f0-9]{36}$/i);
  assert.equal(submitBody.status, 'queued');
  assert.match(String(submitBody.statusUrl || ''), /^\/api\/image\?queue=v1&jobId=/);

  await submitCtx.flush();

  const statusRequest = new Request(`https://example.test${submitBody.statusUrl as string}`, {
    method: 'GET',
  });
  const statusResponse = await worker.fetch(statusRequest, env, createExecutionContext() as any);
  const statusBody = await statusResponse.json() as Record<string, any>;

  assert.equal(statusResponse.status, 200);
  assert.deepEqual(sortedKeys(statusBody), [
    'artifacts',
    'attempts',
    'createdAt',
    'error',
    'jobId',
    'maxAttempts',
    'metadata',
    'promptId',
    'requestId',
    'response',
    'status',
    'updatedAt',
  ]);
  assert.equal(statusBody.jobId, submitBody.jobId);
  assert.equal(statusBody.requestId, submitBody.requestId);
  assert.equal(statusBody.status, 'completed');
  assert.match(String(statusBody.promptId || ''), /^mock-/);
  assert.match(String(statusBody.createdAt || ''), /^\d{4}-\d{2}-\d{2}T/);
  assert.match(String(statusBody.updatedAt || ''), /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(typeof statusBody.attempts, 'number');
  assert.equal(typeof statusBody.maxAttempts, 'number');
  assert.equal(statusBody.error, null);

  assert.equal(Array.isArray(statusBody.artifacts), true);
  assert.equal(statusBody.artifacts.length, 2);
  assert.deepEqual(sortedKeys(statusBody.artifacts[0] as Record<string, unknown>), [
    'artifactId',
    'createdAt',
    'format',
    'height',
    'jobId',
    'kind',
    'mimeType',
    'path',
    'sizeBytes',
    'width',
  ]);

  assert.deepEqual(sortedKeys(statusBody.metadata as Record<string, unknown>), ['createdAt', 'jobId', 'path', 'payload']);
  assert.deepEqual(sortedKeys(statusBody.metadata.payload as Record<string, unknown>), [
    'artifacts',
    'checkpoint',
    'gateway',
    'jobId',
    'postProcessing',
    'promptAnalytics',
    'promptId',
    'reasoningChain',
    'requestId',
    'styleFamily',
  ]);

  assert.deepEqual(sortedKeys(statusBody.response as Record<string, unknown>), ['error', 'images', 'modelInfo', 'requestId', 'status', 'timing']);
  assert.deepEqual(sortedKeys(statusBody.response.modelInfo as Record<string, unknown>), [
    'actualCfg',
    'actualSteps',
    'checkpoint',
    'lorasApplied',
    'predictionType',
    'vae',
  ]);
  assert.deepEqual(sortedKeys(statusBody.response.images[0] as Record<string, unknown>), [
    'format',
    'height',
    'seed',
    'sizeBytes',
    'thumbnailUrl',
    'url',
    'width',
  ]);
});