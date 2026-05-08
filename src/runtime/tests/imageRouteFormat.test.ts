import assert from 'node:assert/strict';
import test from 'node:test';

import { buildIonImageV2RouteResponse } from '../../image-gen/app/ion-image-route-format.ts';
import {
  buildIonImagePostProcessingSummary,
  buildIonImagePromptAnalytics,
} from '../../image-gen/post-processing/ion-image-post-processor.ts';
import type { IonImagePipelineResult } from '../../image-gen/shared/types.ts';

function createPipelineResult(): IonImagePipelineResult {
  return {
    request: {
      requestId: 'req_test_123',
      userId: 'usr_test',
      sessionId: 'sess_test',
      priority: 'interactive',
      timestamp: '2026-05-08T00:00:00.000Z',
      prompt: {
        positive: 'masterpiece, cozy, warm lighting, window light',
        negative: 'lowres, bad anatomy',
        qualityTags: ['masterpiece', 'best quality'],
        styleTags: ['lo-fi', 'warm lighting'],
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
    },
    workflow: {
      metadata: {
        style_family: 'lofi_aesthetic',
        checkpoint: 'noobai-xl-vpred-v1.0',
      },
    },
    promptId: 'mock-prompt-123',
    imageBytes: new Uint8Array([137, 80, 78, 71]),
    outputModel: 'noobai-xl-vpred-v1.0',
    gatewayKind: 'mock',
  };
}

test('image route formatter builds the intentional v2 response contract', () => {
  const response = buildIonImageV2RouteResponse({
    userId: 'usr_test',
    imageDataUrl: 'data:image/png;base64,AAAA',
    filename: 'ionirix_lofi_aesthetic_test.png',
    mimeType: 'image/png',
    mode: 'simple',
    quality: 'ultra',
    ratio: '3:2',
    feedbackApplied: true,
    styleSource: 'session-or-request',
    camera: {
      value: 'medium shot',
      source: 'session-or-request',
    },
    lighting: {
      value: 'warm evening light',
      source: 'prompt',
    },
    materials: {
      values: ['wood', 'glass'],
      source: 'prompt',
    },
    safety: {
      ageTier: 'adult',
      explicitAllowed: false,
      illegalBlocked: false,
    },
    pipelineResult: createPipelineResult(),
  });

  assert.equal(response.user_id, 'usr_test');
  assert.equal(response.imageDataUrl, 'data:image/png;base64,AAAA');
  assert.equal(response.filename, 'ionirix_lofi_aesthetic_test.png');
  assert.equal(response.metadata.pipeline.version, 'v2');
  assert.equal(response.metadata.pipeline.gateway, 'mock');
  assert.equal(response.metadata.request.styleFamily, 'lofi_aesthetic');
  assert.equal(response.metadata.request.feedbackApplied, true);
  assert.equal(response.metadata.image.mimeType, 'image/png');
  assert.equal(response.metadata.image.resolution, '1536x1024');
  assert.equal(response.metadata.model.outputModel, 'noobai-xl-vpred-v1.0');
  assert.equal(response.metadata.prompt.negative, 'lowres, bad anatomy');
  assert.deepEqual(response.metadata.postProcessing, buildIonImagePostProcessingSummary(createPipelineResult().request));
  assert.deepEqual(response.metadata.promptAnalytics, buildIonImagePromptAnalytics(createPipelineResult().request));
  assert.deepEqual(response.metadata.scene.materials.values, ['wood', 'glass']);
  assert.equal(response.debug, undefined);
});

test('image route formatter includes debug payload only when requested', () => {
  const response = buildIonImageV2RouteResponse({
    userId: 'usr_test',
    imageDataUrl: 'data:image/png;base64,AAAA',
    filename: 'ionirix_lofi_aesthetic_test.png',
    mimeType: 'image/png',
    mode: 'simple',
    quality: 'ultra',
    ratio: '3:2',
    feedbackApplied: false,
    styleSource: 'auto',
    camera: {
      value: '',
      source: 'none',
    },
    lighting: {
      value: 'warm evening light',
      source: 'prompt',
    },
    materials: {
      values: [],
      source: 'none',
    },
    safety: {
      ageTier: 'adult',
      explicitAllowed: false,
      illegalBlocked: false,
    },
    pipelineResult: createPipelineResult(),
    debugRequested: {
      mode: 'simple',
      stylePack: 'lofi',
      inferredStyleFromPrompt: 'lofi',
      effectiveStylePack: 'lofi',
      quality: 'ultra',
      renderingStyle: 'lofi_aesthetic',
      inferredCameraFromPrompt: null,
      effectiveCamera: '',
      inferredLightingFromPrompt: 'warm evening light',
      effectiveLighting: 'warm evening light',
      inferredMaterialsFromPrompt: [],
      effectiveMaterials: [],
      availableStyles: ['lofi', 'cinematic'],
      ratio: '3:2',
      resolution: '1536x1024',
      width: 1536,
      height: 1024,
      seed: 42,
    },
  });

  assert.equal(response.debug?.requested.renderingStyle, 'lofi_aesthetic');
  assert.equal(response.debug?.v2_pipeline.gateway, 'mock');
  assert.equal(response.debug?.v2_pipeline.promptId, 'mock-prompt-123');
  assert.deepEqual(response.debug?.v2_pipeline.workflowMetadata, {
    style_family: 'lofi_aesthetic',
    checkpoint: 'noobai-xl-vpred-v1.0',
  });
});