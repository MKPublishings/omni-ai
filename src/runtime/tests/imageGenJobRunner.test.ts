import assert from 'node:assert/strict';
import test from 'node:test';

import { IonImageOrchestrator } from '../../image-gen/orchestration/ion-image-orchestrator.ts';
import { runNextIonImageJob } from '../../image-gen/app/ion-image-job-runner.ts';
import { InMemoryImageJobQueue } from '../../image-gen/queue/InMemoryImageJobQueue.ts';
import { InMemoryImageArtifactStorage } from '../../image-gen/storage/InMemoryImageArtifactStorage.ts';
import {
  buildIonImagePostProcessingSummary,
  buildIonImagePromptAnalytics,
} from '../../image-gen/post-processing/ion-image-post-processor.ts';

test('image job runner executes queued requests and persists artifacts plus metadata', async () => {
  const orchestrator = new IonImageOrchestrator();
  const queue = new InMemoryImageJobQueue({ ION_MOCK: 'true' });
  const storage = new InMemoryImageArtifactStorage({
    ION_MOCK: 'true',
    IMAGE_STORAGE_PATH: './tmp/images',
    THUMBNAIL_STORAGE_PATH: './tmp/thumbs',
    METADATA_DB_URL: 'memory://image-meta',
  });

  const request = await orchestrator.processRequest({
    userId: 'usr_test',
    sessionId: 'sess_test',
    prompt: 'Draw a cozy girl studying by the window with warm evening light.',
    styleFamily: 'lofi_aesthetic',
    parameterOverrides: {
      width: 1536,
      height: 1024,
      seed: 42,
    },
  });

  const queued = await queue.enqueue(request);
  const completed = await runNextIonImageJob(queue, storage, {
    ION_MOCK: 'true',
    DEFAULT_CHECKPOINT: 'ion-citizen-xl-vpred-v2.0',
  });

  assert.ok(completed);
  assert.equal(completed?.jobId, queued.jobId);
  assert.equal(completed?.status, 'completed');
  assert.equal(completed?.promptId?.startsWith('mock-'), true);
  assert.equal(completed?.response?.images.length, 1);
  assert.equal(completed?.response?.modelInfo.checkpoint, 'ion-citizen-xl-vpred-v2.0');
  assert.equal((completed?.response?.timing.postProcessingMs || 0) >= 0, true);
  assert.equal((completed?.response?.timing.totalMs || 0) >= (completed?.response?.timing.postProcessingMs || 0), true);

  const artifacts = await storage.getImages(queued.jobId);
  assert.equal(artifacts.length, 2);
  assert.equal(artifacts[0]?.kind, 'image');
  assert.equal(artifacts[1]?.kind, 'thumbnail');

  const metadata = await storage.getMetadata(queued.jobId);
  assert.equal(metadata?.jobId, queued.jobId);
  assert.equal((metadata?.payload as { checkpoint?: string })?.checkpoint, 'ion-citizen-xl-vpred-v2.0');
  assert.equal((metadata?.payload as { styleFamily?: string })?.styleFamily, 'lofi_aesthetic');
  assert.equal(
    (((metadata?.payload as { executionPlan?: { entities?: unknown[] } })?.executionPlan?.entities?.length) || 0) > 0,
    true,
  );
  assert.equal(Array.isArray((metadata?.payload as { artifacts?: unknown[] })?.artifacts), true);
  assert.deepEqual(
    (metadata?.payload as { postProcessing?: unknown }).postProcessing,
    buildIonImagePostProcessingSummary(request),
  );
  assert.deepEqual(
    (metadata?.payload as { promptAnalytics?: unknown }).promptAnalytics,
    buildIonImagePromptAnalytics(request),
  );
});