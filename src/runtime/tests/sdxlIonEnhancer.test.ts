/**
 * Test Suite: SDXL ION Enhancement Validation
 * 
 * Tests the improvements made to stable-diffusion-xl-base-1.0 using ION enhancement
 */

import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  buildIonEnhancedSdxlPrompt,
  optimizeSdxlParameters,
  buildSdxlEnhancementMetadata,
  type EnhancedPromptResult,
  type SdxlParameterOptimization,
} from '../../image-gen/integration/sdxl-ion-enhancer.ts';

test('SDXL ION Enhancement - Prompt Building', async (t) => {
  await t.test('builds enhanced prompt for anime style', () => {
    const result: EnhancedPromptResult = buildIonEnhancedSdxlPrompt(
      'cute anime girl with long hair',
      {
        animeLike: true,
        styleFamily: undefined,
        checkpointId: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
      }
    );

    assert.ok(result.positive.includes('cute anime girl'));
    assert.ok(result.positive.includes('masterpiece'));
    assert.ok(result.positive.includes('best quality'));
    assert.ok(result.qualityTags.length > 0);
    assert.ok(result.styleTags.length > 0);
    assert.ok(result.negative.includes('realistic'));
    assert.ok(result.negative.includes('photorealistic'));
    assert.strictEqual(result.inferredMood, 'stylized');
  });

  await t.test('builds enhanced prompt for photorealistic style', () => {
    const result: EnhancedPromptResult = buildIonEnhancedSdxlPrompt(
      'professional portrait of a woman in a corporate office',
      {
        animeLike: false,
        styleFamily: undefined,
        checkpointId: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
      }
    );

    assert.ok(result.positive.includes('professional portrait'));
    assert.ok(result.positive.includes('masterpiece'));
    assert.ok(result.qualityTags.length > 0);
    assert.ok(result.negative.includes('cartoon'));
    assert.ok(result.negative.includes('anime'));
  });

  await t.test('includes quality tags in prompt', () => {
    const result: EnhancedPromptResult = buildIonEnhancedSdxlPrompt(
      'landscape painting',
      {
        animeLike: false,
        styleFamily: undefined,
        checkpointId: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
      }
    );

    assert.ok(result.positive.includes('high quality'));
    assert.ok(result.positive.includes('detailed'));
    assert.ok(result.qualityTags.some((tag: string) => tag.includes('quality')));
  });

  await t.test('handles empty prompt gracefully', () => {
    const result: EnhancedPromptResult = buildIonEnhancedSdxlPrompt(
      '',
      {
        animeLike: false,
        styleFamily: undefined,
        checkpointId: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
      }
    );

    assert.ok(result.positive.length > 0);
    assert.ok(result.negative.length > 0);
    assert.ok(result.qualityTags.length > 0);
  });
});

test('SDXL ION Enhancement - Parameter Optimization', async (t) => {
  await t.test('optimizes parameters for anime style', () => {
    const result: SdxlParameterOptimization = optimizeSdxlParameters(
      undefined,
      true, // animeLike
      7,    // baseGuidance
      28    // baseSteps
    );

    assert.ok(result.guidance > 7); // Should be higher for anime
    assert.ok(result.steps > 28); // Should be higher for anime
    assert.strictEqual(result.sampler, 'dpmpp_2m_karras');
    assert.ok(result.cfgRescale !== undefined);
  });

  await t.test('optimizes parameters for photorealistic style', () => {
    const result: SdxlParameterOptimization = optimizeSdxlParameters(
      undefined,
      false, // animeLike
      7,     // baseGuidance
      28     // baseSteps
    );

    assert.ok(result.guidance <= 7);
    assert.strictEqual(result.steps, 28);
    assert.ok(result.sampler);
  });

  await t.test('respects step limits', () => {
    const result: SdxlParameterOptimization = optimizeSdxlParameters(
      undefined,
      true,
      7,
      28
    );

    assert.ok(result.steps <= 50);
    assert.ok(result.steps >= 1);
  });

  await t.test('respects guidance limits', () => {
    const result: SdxlParameterOptimization = optimizeSdxlParameters(
      undefined,
      true,
      15, // Higher than typical
      28
    );

    assert.ok(result.guidance <= 15);
  });
});

test('SDXL ION Enhancement - Metadata Building', async (t) => {
  await t.test('builds complete enhancement metadata', () => {
    const metadata = buildSdxlEnhancementMetadata(
      'fantasy dragon in mountains',
      undefined,
      false,
      '@cf/stabilityai/stable-diffusion-xl-base-1.0'
    );

    assert.ok(metadata.promptEnhanced);
    assert.ok(metadata.parametersOptimized);
    assert.strictEqual(metadata.animeLike, false);
    assert.ok(metadata.processedAt);
    assert.ok(new Date(metadata.processedAt).getTime() > 0);
  });

  await t.test('metadata includes both positive and negative prompts', () => {
    const metadata = buildSdxlEnhancementMetadata(
      'cozy cabin in snow',
      undefined,
      false,
      '@cf/stabilityai/stable-diffusion-xl-base-1.0'
    );

    assert.ok(metadata.promptEnhanced.positive.length > 0);
    assert.ok(metadata.promptEnhanced.negative.length > 0);
    assert.ok(metadata.promptEnhanced.qualityTags.length > 0);
  });

  await t.test('metadata includes optimization parameters', () => {
    const metadata = buildSdxlEnhancementMetadata(
      'manga style character',
      undefined,
      true,
      '@cf/stabilityai/stable-diffusion-xl-base-1.0'
    );

    assert.ok(metadata.parametersOptimized.guidance > 0);
    assert.ok(metadata.parametersOptimized.steps > 0);
    assert.ok(metadata.parametersOptimized.sampler);
  });
});

test('SDXL ION Enhancement - Integration', async (t) => {
  await t.test('anime prompt produces different output than photorealistic', () => {
    const animeResult = buildIonEnhancedSdxlPrompt(
      'character with large eyes',
      {
        animeLike: true,
        styleFamily: undefined,
        checkpointId: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
      }
    );

    const realisticResult = buildIonEnhancedSdxlPrompt(
      'character with large eyes',
      {
        animeLike: false,
        styleFamily: undefined,
        checkpointId: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
      }
    );

    assert.notStrictEqual(animeResult.positive, realisticResult.positive);
    assert.notStrictEqual(animeResult.negative, realisticResult.negative);
    assert.ok(animeResult.positive.includes('anime'));
    assert.ok(!realisticResult.positive.includes('anime'));
  });

  await t.test('parameter optimization varies by style', () => {
    const animeParams = optimizeSdxlParameters(undefined, true, 7, 28);
    const realisticParams = optimizeSdxlParameters(undefined, false, 7, 28);

    assert.notStrictEqual(animeParams.guidance, realisticParams.guidance);
  });

  await t.test('produces consistent results', () => {
    const prompt = 'beautiful landscape with sunset';
    
    const result1 = buildIonEnhancedSdxlPrompt(prompt, {
      animeLike: false,
      styleFamily: undefined,
      checkpointId: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    });

    const result2 = buildIonEnhancedSdxlPrompt(prompt, {
      animeLike: false,
      styleFamily: undefined,
      checkpointId: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    });

    // Results should be consistent (quality tags and prompt structure)
    assert.strictEqual(result1.qualityTags.length, result2.qualityTags.length);
  });
});

test('SDXL ION Enhancement - Edge Cases', async (t) => {
  await t.test('handles very long prompts', () => {
    const longPrompt = 'a'.repeat(1000);
    const result = buildIonEnhancedSdxlPrompt(longPrompt, {
      animeLike: false,
      styleFamily: undefined,
      checkpointId: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    });

    assert.ok(result.positive.length > 0);
    assert.ok(result.negative.length > 0);
  });

  await t.test('handles special characters in prompt', () => {
    const specialPrompt = 'character #1 with $eyes & "beautiful" features';
    const result = buildIonEnhancedSdxlPrompt(specialPrompt, {
      animeLike: false,
      styleFamily: undefined,
      checkpointId: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    });

    assert.ok(result.positive.length > 0);
    assert.ok(result.negative.length > 0);
  });

  await t.test('handles numeric inputs in parameters', () => {
    const result = optimizeSdxlParameters(undefined, true, 7.5, 28);
    assert.strictEqual(typeof result.guidance, 'number');
    assert.strictEqual(typeof result.steps, 'number');
  });
});
