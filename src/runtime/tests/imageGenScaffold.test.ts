import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveionConfig } from '../../image-gen/config/ion.config.ts';
import { readImageGenEnvironment } from '../../image-gen/config/env.ts';
import { buildionWorkflow } from '../../image-gen/backend/gateway/workflow-builder.ts';
import { CHECKPOINT_REGISTRY, getCheckpointConfig } from '../../image-gen/config/models.config.ts';
import { MockionClient } from '../../image-gen/backend/gateway/MockionClient.ts';
import { getImageGenerationError } from '../../image-gen/shared/error-codes.ts';
import { generationRequestSchema, progressEventSchema, stylePresetSchema } from '../../image-gen/shared/schemas.ts';
import { BASE_NEGATIVE_PROMPT, STYLE_PRESETS } from '../../image-gen/shared/style-presets.ts';
import type { GenerationRequest } from '../../image-gen/shared/types.ts';

function makeGenerationRequest(): GenerationRequest {
  return {
    requestId: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'usr_test',
    sessionId: 'sess_test',
    priority: 'interactive',
    timestamp: '2026-05-08T00:00:00.000Z',
    prompt: {
      positive: 'masterpiece, best quality, absurdres, 1girl, sunset, orange sky, backlighting',
      negative: BASE_NEGATIVE_PROMPT,
      qualityTags: ['masterpiece', 'best quality', 'absurdres'],
      styleTags: ['anime', 'cinematic lighting'],
    },
    model: {
      checkpoint: 'ion-citizen-xl-vpred-v2.0',
      predictionType: 'v_prediction',
      vae: 'sdxl-vae-fp16-fix',
      loras: [],
      clipSkip: 2,
    },
    parameters: {
      width: 1024,
      height: 1536,
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
      reasoningChain: ['intent_parse', 'style_infer', 'tag_expand', 'quality_inject', 'negative_assemble', 'param_optimize', 'workflow_build'],
      originalUserPrompt: 'draw a warrior in a sunset',
      styleFamily: 'cinematic_niji',
      inferredMood: 'dramatic',
      confidence: 0.92,
    },
  };
}

test('style presets conform to the shared schema', () => {
  for (const preset of Object.values(STYLE_PRESETS)) {
    const parsed = stylePresetSchema.parse(preset);
    assert.equal(parsed.id, preset.id);
  }
});

test('generation request schema accepts the scaffolded request shape', () => {
  const parsed = generationRequestSchema.parse(makeGenerationRequest());

  assert.equal(parsed.model.checkpoint, 'ion-citizen-xl-vpred-v2.0');
  assert.equal(parsed.parameters.height, 1536);
  assert.equal(parsed.ionMetadata.styleFamily, 'cinematic_niji');
});

test('environment readers apply defaults and overrides deterministically', () => {
  const defaults = readImageGenEnvironment({});
  assert.equal(defaults.ionMock, true);
  assert.equal(defaults.defaultCheckpoint, 'grok-imagine-image-beta');

  const overridden = readImageGenEnvironment({
    ion_HOST: 'http://127.0.0.1:9000',
    ion_FETCH_HOST: 'https://internal-ion.example.com',
    ion_WS: 'ws://127.0.0.1:9000/ws',
    ion_MOCK: 'false',
    DEFAULT_STEPS: '32',
    RATE_LIMIT_PER_HOUR: '45',
  });

  assert.equal(overridden.ionHost, 'http://127.0.0.1:9000');
  assert.equal(overridden.ionFetchHost, 'https://internal-ion.example.com');
  assert.equal(overridden.ionWs, 'ws://127.0.0.1:9000/ws');
  assert.equal(overridden.ionMock, false);
  assert.equal(overridden.defaultSteps, 32);
  assert.equal(overridden.rateLimitPerHour, 45);
});

test('ion config normalizes connection endpoints', () => {
  const config = resolveionConfig({
    ion_HOST: 'http://localhost:8188///',
    ion_FETCH_HOST: 'https://internal-ion.example.com///',
    ion_WS: 'ws://localhost:8188/ws',
    ion_MOCK: 'true',
  });

  assert.equal(config.host, 'https://internal-ion.example.com');
  assert.equal(config.historyPath('abc 123'), '/history/abc%20123');
  assert.equal(config.mock, true);
});

test('checkpoint registry exposes the ION citizen defaults', () => {
  const citizen = getCheckpointConfig('ion-citizen-xl-vpred-v2.0');

  assert.equal(citizen.predictionType, 'v_prediction');
  assert.deepEqual(citizen.qualityTags, ['masterpiece', 'best quality', 'absurdres']);
  assert.equal(CHECKPOINT_REGISTRY['pony-diffusion-v6-xl']?.sourceTag, 'source_anime');
});

test('workflow builder produces a minimal v-pred citizen graph', () => {
  const workflow = buildionWorkflow(makeGenerationRequest());

  assert.equal((workflow['1'] as Record<string, any>).class_type, 'CheckpointLoaderSimple');
  assert.equal((workflow['5'] as Record<string, any>).class_type, 'KSampler');
  assert.equal((workflow['7'] as Record<string, any>).class_type, 'SaveImage');
  assert.equal((workflow['8'] as Record<string, any>).class_type, 'ModelSamplingDiscrete');
  assert.equal((workflow.metadata as Record<string, any>).prediction_type, 'v_prediction');
});

test('error catalog preserves retry semantics for gateway outages', () => {
  const error = getImageGenerationError('E_ion_DOWN');

  assert.equal(error.retriable, true);
  assert.equal(error.suggestedAction, 'check_gateway');
});

test('mock gateway produces deterministic progress and image output', async () => {
  const gateway = new MockionClient();
  const submission = await gateway.submitWorkflow({
    checkpoint: 'ion-citizen-xl-vpred-v2.0',
    steps: 28,
  });

  assert.match(submission.promptId, /^mock-/);

  const status = await gateway.getJobStatus(submission.promptId);
  assert.equal(status.promptId, submission.promptId);
  assert.equal(status.totalSteps > 0, true);

  const events = [];
  for await (const event of gateway.getProgress(submission.promptId)) {
    events.push(progressEventSchema.parse(event));
  }

  assert.equal(events[0]?.status, 'queued');
  assert.equal(events.at(-1)?.status, 'completed');
  assert.equal(events.at(-1)?.previewImageUrl, 'mock://preview/final');

  const image = await gateway.getOutputImage(submission.promptId);
  assert.equal(image.byteLength > 1000, true);
  assert.equal(image[0], 0x89);
  assert.equal(image[1], 0x50);
  assert.equal(image[2], 0x4e);
  assert.equal(image[3], 0x47);
});