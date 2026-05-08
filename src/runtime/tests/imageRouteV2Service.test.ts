import assert from 'node:assert/strict';
import test from 'node:test';

import { buildIonImageV2RouteResult } from '../../image-gen/app/ion-image-v2-route-service.ts';
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

test('image route v2 service builds transport payload, headers, and telemetry without the worker', async () => {
  const consoleMessages: string[] = [];
  const originalConsoleInfo = console.info;
  console.info = (...args: unknown[]) => {
    consoleMessages.push(args.map((arg) => String(arg)).join(' '));
  };

  try {
    const result = await buildIonImageV2RouteResult({
      userId: 'usr_test',
      mode: 'simple',
      quality: 'ultra',
      ratio: '3:2',
      feedbackApplied: false,
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
        values: ['wood'],
        source: 'prompt',
      },
      safety: {
        ageTier: 'adult',
        explicitAllowed: false,
        illegalBlocked: false,
      },
      pipelineResult: createPipelineResult(),
      totalMs: 12,
    });

    assert.equal(result.headers['Content-Type'], 'application/json');
    assert.equal(result.headers['X-ION-Image-Model'], 'noobai-xl-vpred-v1.0');
    assert.equal(result.headers['Access-Control-Expose-Headers'], 'X-ION-Image-Model');
    assert.match(result.body.imageDataUrl, /^data:image\/png;base64,/);
    assert.match(result.body.filename, /^ionirix_lofi_aesthetic_/);
    assert.equal(result.body.metadata.image.mimeType, 'image/png');

    const imageLog = consoleMessages.find((message) => message.startsWith('[ION IMAGE] '));
    assert.ok(imageLog);
    assert.match(String(imageLog || ''), /"jobId":"sync-/);
    assert.match(String(imageLog || ''), /"totalMs":12/);
  } finally {
    console.info = originalConsoleInfo;
  }
});

test('image route v2 service derives default quality and ratio from pipeline result when omitted', async () => {
  const result = await buildIonImageV2RouteResult({
    userId: 'usr_test',
    mode: 'simple',
    feedbackApplied: false,
    styleSource: 'auto',
    camera: {
      value: '',
      source: 'none',
    },
    lighting: {
      value: '',
      source: 'none',
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
    totalMs: 9,
  });

  assert.equal(result.body.metadata.request.quality, 'ultra');
  assert.equal(result.body.metadata.image.ratio, '3:2');
});