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
      COMFYUI_MOCK: 'true',
      DEFAULT_CHECKPOINT: 'noobai-xl-vpred-v1.0',
    },
  );

  assert.equal(result.gatewayKind, 'mock');
  assert.equal(result.request.ionMetadata.styleFamily, 'lofi_aesthetic');
  assert.equal(result.request.parameters.width, 1536);
  assert.equal(result.request.parameters.height, 1024);
  assert.equal(result.request.parameters.seed, 42);
  assert.equal(result.outputModel, 'noobai-xl-vpred-v1.0');
  assert.ok(result.promptId.startsWith('mock-'));
  assert.ok(result.imageBytes.length > 0);
  const metadata = result.workflow.metadata as { style_family?: string } | undefined;
  assert.equal(String(metadata?.style_family || ''), 'lofi_aesthetic');
});