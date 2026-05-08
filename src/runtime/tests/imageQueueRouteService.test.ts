import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getIonImageQueueStatusRouteResult,
  submitIonImageQueueRouteResult,
} from '../../image-gen/app/ion-image-queue-route-service.ts';
import { resetIonImageQueueRuntime } from '../../image-gen/app/ion-image-queue-runtime.ts';

const queueEnv = {
  COMFYUI_MOCK: 'true',
  DEFAULT_CHECKPOINT: 'noobai-xl-vpred-v1.0',
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
  assert.equal(status.body.metadata?.payload.checkpoint, 'noobai-xl-vpred-v1.0');
  assert.equal(status.body.response?.modelInfo.checkpoint, 'noobai-xl-vpred-v1.0');
  assert.equal(status.body.response?.images[0]?.format, 'png');
});