import assert from 'node:assert/strict';
import test from 'node:test';

import { executeIonImagePipeline } from '../../image-gen/app/ion-image-pipeline.ts';

test('image pipeline adapter builds and executes the new workflow path with the mock gateway', async () => {
  const result = await executeIonImagePipeline(
    {
      userId: 'usr_test',
      prompt: 'Draw a cozy girl studying by the window with warm evening light.',
      stylePack: 'lofi',
      width: 1536,
      height: 1024,
      seed: 42,
    },
    {
      ion_MOCK: 'true',
      DEFAULT_CHECKPOINT: 'ion-citizen-xl-vpred-v2.0',
    },
  );

  assert.equal(result.gatewayKind, 'mock');
  assert.equal(result.request.ionMetadata.styleFamily, 'lofi_aesthetic');
  assert.equal(result.request.parameters.width, 1536);
  assert.equal(result.request.parameters.height, 1024);
  assert.equal(result.request.parameters.seed, 42);
  assert.equal(result.outputModel, 'ion-citizen-xl-vpred-v2.0');
  assert.equal((result.request.ionMetadata.executionPlan?.entities.length || 0) > 0, true);
  assert.equal(result.request.ionMetadata.executionPlan?.simulationSupportEnabled, false);
  assert.ok(result.promptId.startsWith('mock-'));
  assert.ok(result.imageBytes.length > 0);
  const metadata = result.workflow.metadata as { style_family?: string } | undefined;
  assert.equal(String(metadata?.style_family || ''), 'lofi_aesthetic');
});