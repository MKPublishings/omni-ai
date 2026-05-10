import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryImageJobQueue } from '../../image-gen/queue/InMemoryImageJobQueue.ts';
import { InMemoryImageArtifactStorage } from '../../image-gen/storage/InMemoryImageArtifactStorage.ts';
import type { GenerationRequest, GenerationResponse } from '../../image-gen/shared/types.ts';

function createGenerationRequest(requestId: string): GenerationRequest {
  return {
    requestId,
    userId: 'usr_test',
    sessionId: 'sess_test',
    priority: 'interactive',
    timestamp: '2026-05-08T00:00:00.000Z',
    prompt: {
      positive: 'masterpiece, cozy study scene',
      negative: 'lowres',
      qualityTags: ['masterpiece'],
      styleTags: ['lo-fi'],
    },
    model: {
      checkpoint: 'ion-citizen-xl-vpred-v2.0',
      predictionType: 'v_prediction',
      vae: 'sdxl-vae-fp16-fix',
      loras: [],
      clipSkip: 2,
    },
    parameters: {
      width: 1536,
      height: 1024,
      steps: 28,
      cfgScale: 5,
      cfgRescale: 0.2,
      sampler: 'euler',
      scheduler: 'normal',
      seed: 42,
      batchSize: 1,
    },
    postProcessing: {
      upscale: {
        enabled: false,
        model: '4x-UltraSharp',
        scale: 2,
      },
      format: 'png',
      quality: 95,
      embedMetadata: true,
      generateThumbnail: true,
    },
    ionMetadata: {
      reasoningChain: ['intent_parse', 'workflow_build', 'submit'],
      originalUserPrompt: 'Draw a cozy study scene.',
      styleFamily: 'lofi_aesthetic',
      inferredMood: 'cozy',
      confidence: 0.9,
    },
  };
}

function createGenerationResponse(requestId: string): GenerationResponse {
  return {
    requestId,
    status: 'completed',
    images: [
      {
        url: '/storage/images/job/image.png',
        thumbnailUrl: '/storage/thumbs/job/thumb.png',
        width: 1536,
        height: 1024,
        format: 'png',
        sizeBytes: 4,
        seed: 42,
      },
    ],
    timing: {
      queueMs: 1,
      modelLoadMs: 2,
      inferenceMs: 3,
      postProcessingMs: 4,
      totalMs: 10,
    },
    modelInfo: {
      checkpoint: 'ion-citizen-xl-vpred-v2.0',
      predictionType: 'v_prediction',
      lorasApplied: [],
      actualSteps: 28,
      actualCfg: 5,
      vae: 'sdxl-vae-fp16-fix',
    },
    error: null,
  };
}

test('in-memory image queue enforces queued capacity and tracks state transitions', async () => {
  const queue = new InMemoryImageJobQueue({ MAX_QUEUE_SIZE: '1' });
  const request = createGenerationRequest('req_queue_1');

  const queued = await queue.enqueue(request);
  assert.equal(queued.status, 'queued');
  assert.equal(queued.promptId, null);

  await assert.rejects(() => queue.enqueue(createGenerationRequest('req_queue_2')), /capacity/i);

  const processing = await queue.dequeueNext();
  assert.ok(processing);
  assert.equal(processing?.status, 'processing');
  assert.equal(processing?.attempts, 1);

  const completed = await queue.markCompleted(queued.jobId, createGenerationResponse(request.requestId));
  assert.equal(completed.status, 'completed');
  assert.equal(completed.response?.requestId, request.requestId);

  const stored = await queue.getJob(queued.jobId);
  assert.equal(stored?.status, 'completed');
});

test('in-memory artifact storage persists image artifacts and metadata records', async () => {
  const storage = new InMemoryImageArtifactStorage({
    IMAGE_STORAGE_PATH: './tmp/images',
    THUMBNAIL_STORAGE_PATH: './tmp/thumbs',
    METADATA_DB_URL: 'memory://image-meta',
  });

  const image = await storage.putImage({
    jobId: 'job_storage_1',
    kind: 'image',
    bytes: new Uint8Array([137, 80, 78, 71]),
    mimeType: 'image/png',
    format: 'png',
    width: 1536,
    height: 1024,
  });

  const metadata = await storage.putMetadata('job_storage_1', {
    checkpoint: 'ion-citizen-xl-vpred-v2.0',
    styleFamily: 'lofi_aesthetic',
  });

  assert.match(image.path, /^\.\/tmp\/images\/job_storage_1\/artifact-/);
  assert.equal(image.sizeBytes, 4);
  const bytes = await storage.getImageBytes(image.artifactId);
  assert.deepEqual([...String(bytes)], [...String(new Uint8Array([137, 80, 78, 71]))]);

  const images = await storage.getImages('job_storage_1');
  assert.equal(images.length, 1);
  assert.equal(images[0]?.artifactId, image.artifactId);

  const storedMetadata = await storage.getMetadata('job_storage_1');
  assert.equal(storedMetadata?.path, 'memory://image-meta#job_storage_1');
  assert.deepEqual(storedMetadata?.payload, {
    checkpoint: 'ion-citizen-xl-vpred-v2.0',
    styleFamily: 'lofi_aesthetic',
  });
  assert.equal(metadata.jobId, 'job_storage_1');
});