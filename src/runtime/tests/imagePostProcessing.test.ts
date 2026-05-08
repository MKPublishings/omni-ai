import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildIonImagePostProcessingSummary,
  buildIonImagePromptAnalytics,
} from '../../image-gen/post-processing/ion-image-post-processor.ts';
import type { GenerationRequest } from '../../image-gen/shared/types.ts';

function createGenerationRequest(): GenerationRequest {
  return {
    requestId: 'req_post_1',
    userId: 'usr_test',
    sessionId: 'sess_test',
    priority: 'interactive',
    timestamp: '2026-05-08T00:00:00.000Z',
    prompt: {
      positive: 'masterpiece, best quality, cozy study scene, warm evening light',
      negative: 'lowres, bad anatomy',
      qualityTags: ['masterpiece', 'best quality'],
      styleTags: ['lo-fi', 'warm evening light'],
    },
    model: {
      checkpoint: 'noobai-xl-vpred-v1.0',
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
      reasoningChain: ['intent_parse', 'style_infer', 'workflow_build', 'submit'],
      originalUserPrompt: 'Draw a cozy girl studying by the window with warm evening light.',
      styleFamily: 'lofi_aesthetic',
      inferredMood: 'cozy',
      confidence: 0.9,
    },
  };
}

test('image post-processor builds stable post-processing summary and prompt analytics', () => {
  const request = createGenerationRequest();

  assert.deepEqual(buildIonImagePostProcessingSummary(request), {
    outputFormat: 'png',
    quality: 95,
    metadataEmbedded: true,
    thumbnailGenerated: true,
    upscaleRequested: false,
  });

  assert.deepEqual(buildIonImagePromptAnalytics(request), {
    originalPromptLength: request.ionMetadata.originalUserPrompt.length,
    positivePromptLength: request.prompt.positive.length,
    negativePromptLength: request.prompt.negative.length,
    qualityTagCount: 2,
    styleTagCount: 2,
  });
});