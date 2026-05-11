import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getIonImageQueueStatusRouteResult,
  submitIonImageQueueRouteResult,
} from '../../image-gen/app/ion-image-queue-route-service.ts';
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

const queueEnv = {
  ION_MOCK: 'true',
  DEFAULT_CHECKPOINT: 'ion-citizen-xl-vpred-v2.0',
  IMAGE_STORAGE_PATH: './tmp/images',
  THUMBNAIL_STORAGE_PATH: './tmp/thumbs',
  METADATA_DB_URL: 'memory://image-meta',
} as const;

test('image queue route service returns typed error results for missing and unknown job ids', async () => {
  resetIonImageQueueRuntime();

  const missingJobId = await getIonImageQueueStatusRouteResult('', queueEnv);
  assert.equal(missingJobId.status, 400);
  assert.deepEqual(missingJobId.body, {
    error: 'jobId is required',
    code: 'missing-job-id',
  });

  const unknownJobId = await getIonImageQueueStatusRouteResult('job-missing', queueEnv);
  assert.equal(unknownJobId.status, 404);
  assert.deepEqual(unknownJobId.body, {
    error: 'Image job not found',
    code: 'image-job-not-found',
  });
});

test('image queue route service returns typed submission and status payloads for queued jobs', async () => {
  resetIonImageQueueRuntime();

  const submitted = await submitIonImageQueueRouteResult(
    {
      userId: 'usr_test',
      prompt: 'Draw a cozy girl studying by the window with warm evening light.',
      stylePack: 'lofi',
      width: 1536,
      height: 1024,
      seed: 42,
    },
    queueEnv,
  );

  assert.equal(submitted.response.status, 202);
  assert.equal(submitted.response.body.queued, true);
  assert.match(submitted.response.body.jobId, /^job-/);
  assert.match(submitted.response.body.requestId, /^[-a-f0-9]{36}$/i);
  assert.equal(submitted.response.body.status, 'queued');
  assert.match(submitted.response.body.statusUrl, /^\/api\/image\?queue=v1&jobId=/);

  await submitted.backgroundTask;

  const status = await getIonImageQueueStatusRouteResult(submitted.response.body.jobId, queueEnv);
  assert.equal(status.status, 200);
  if ('queued' in status.body) {
    assert.fail('expected status response body, received submission response');
  }
  if ('code' in status.body) {
    assert.fail(`expected success status body, received error code ${status.body.code}`);
  }

  assert.equal(status.body.jobId, submitted.response.body.jobId);
  assert.equal(status.body.requestId, submitted.response.body.requestId);
  assert.match(String(status.body.promptId || ''), /^mock-/);
  assert.equal(status.body.status, 'completed');
  assert.equal(status.body.error, null);
  assert.equal(status.body.artifacts.length, 2);
  assert.equal(status.body.metadata?.payload.styleFamily, 'lofi_aesthetic');
  assert.equal(status.body.metadata?.payload.checkpoint, 'ion-citizen-xl-vpred-v2.0');
  assert.equal((status.body.metadata?.payload.executionPlan?.entities.length || 0) > 0, true);
  assert.equal(status.body.response?.modelInfo.checkpoint, 'ion-citizen-xl-vpred-v2.0');
  assert.equal(status.body.response?.images[0]?.format, 'png');
});

test('image queue route service persists job state across runtime reset when KV-like storage is present', async () => {
  resetIonImageQueueRuntime();

  const durableEnv = {
    ...queueEnv,
    IMAGE_QUEUE_RUNTIME: 'kv',
    IMAGE_QUEUE_STATE_BINDING: 'ION_IMAGE_STATE_KV',
    IMAGE_QUEUE_STATE_NAMESPACE: 'test:image:queue:durable',
    ION_IMAGE_STATE_KV: new MemoryNamespace() as any,
  };

  const submitted = await submitIonImageQueueRouteResult(
    {
      userId: 'usr_test',
      prompt: 'Draw a cozy girl studying by the window with warm evening light.',
      stylePack: 'lofi',
      width: 1536,
      height: 1024,
      seed: 42,
    },
    durableEnv,
  );

  await submitted.backgroundTask;
  resetIonImageQueueRuntime();

  const status = await getIonImageQueueStatusRouteResult(submitted.response.body.jobId, durableEnv);
  assert.equal(status.status, 200);
  if ('queued' in status.body) {
    assert.fail('expected status response body, received submission response');
  }
  if ('code' in status.body) {
    assert.fail(`expected success status body, received error code ${status.body.code}`);
  }

  assert.equal(status.body.jobId, submitted.response.body.jobId);
  assert.equal(status.body.status, 'completed');
  assert.equal(status.body.metadata?.payload.checkpoint, 'ion-citizen-xl-vpred-v2.0');
  assert.equal(status.body.response?.images[0]?.format, 'png');
});

test('image queue route service falls back to in-memory runtime unless explicit kv mode is enabled', async () => {
  resetIonImageQueueRuntime();

  const implicitMemoryEnv = {
    ...queueEnv,
    MEMORY: new MemoryNamespace() as any,
  };

  const submitted = await submitIonImageQueueRouteResult(
    {
      userId: 'usr_test',
      prompt: 'Draw a cozy girl studying by the window with warm evening light.',
      stylePack: 'lofi',
      width: 1536,
      height: 1024,
      seed: 42,
    },
    implicitMemoryEnv,
  );

  await submitted.backgroundTask;
  resetIonImageQueueRuntime();

  const status = await getIonImageQueueStatusRouteResult(submitted.response.body.jobId, implicitMemoryEnv);
  assert.equal(status.status, 404);
  assert.deepEqual(status.body, {
    error: 'Image job not found',
    code: 'image-job-not-found',
  });
});