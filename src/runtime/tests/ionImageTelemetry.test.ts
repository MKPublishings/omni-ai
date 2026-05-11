import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createIonImageGenerationLog,
  emitIonImageGenerationLog,
  setIonImageGenerationLogEmitter,
} from '../../image-gen/logging/ion-image-telemetry.ts';

test('ion image telemetry builds completion logs with the expected event shape', () => {
  const log = createIonImageGenerationLog({
    requestId: 'req-1',
    jobId: 'job-1',
    promptId: 'prompt-1',
    status: 'completed',
    gateway: 'ion',
    checkpoint: 'ion-citizen-xl-vpred-v2.0',
    styleFamily: 'lofi_aesthetic',
    artifactCount: 2,
    postProcessingMs: 20,
    totalMs: 125,
    promptAnalytics: {
      originalPromptLength: 10,
      positivePromptLength: 20,
      negativePromptLength: 30,
      qualityTagCount: 4,
      styleTagCount: 5,
    },
    error: null,
  });

  assert.equal(log.event, 'ion.image.job.completed');
  assert.equal(log.errorCode, null);
  assert.equal(log.artifactCount, 2);
  assert.equal(log.gateway, 'ion');
});

test('ion image telemetry routes logs through the injected emitter when present', () => {
  const emitted: unknown[] = [];
  setIonImageGenerationLogEmitter((log) => {
    emitted.push(log);
  });

  try {
    const log = createIonImageGenerationLog({
      requestId: 'req-2',
      jobId: 'job-2',
      promptId: null,
      status: 'failed',
      gateway: null,
      checkpoint: 'ion-citizen-xl-vpred-v2.0',
      styleFamily: 'lofi_aesthetic',
      artifactCount: 0,
      postProcessingMs: 0,
      totalMs: 55,
      promptAnalytics: {
        originalPromptLength: 12,
        positivePromptLength: 24,
        negativePromptLength: 36,
        qualityTagCount: 3,
        styleTagCount: 6,
      },
      error: {
        code: 'E_TIMEOUT',
        message: 'Timed out',
        retriable: true,
        suggestedAction: 'retry',
      },
    });

    emitIonImageGenerationLog(log);

    assert.equal(emitted.length, 1);
    assert.deepEqual(emitted[0], log);
  } finally {
    setIonImageGenerationLogEmitter(null);
  }
});