import assert from 'node:assert/strict';
import test from 'node:test';

import { IonImageOrchestrator } from '../../image-gen/orchestration/ion-image-orchestrator.ts';
import { parseIntent } from '../../image-gen/orchestration/intent-parser.ts';
import { optimizeParameters } from '../../image-gen/orchestration/parameter-optimizer.ts';
import { assemblePrompt } from '../../image-gen/orchestration/prompt-assembler.ts';
import { evaluateImagePromptSafety } from '../../image-gen/orchestration/safety-filter.ts';
import { resolveStyleFamily } from '../../image-gen/orchestration/style-router.ts';
import { expandTags } from '../../image-gen/orchestration/tag-expander.ts';

test('intent parser extracts stable scene signals from natural language', () => {
  const intent = parseIntent('Draw a warrior girl standing on a cliff at sunset with a sword.');

  assert.equal(intent.subject, '1girl');
  assert.equal(intent.action, 'standing');
  assert.equal(intent.mood, 'dramatic');
  assert.equal(intent.timeOfDay, 'sunset');
});

test('style router prefers explicit selection and falls back from mood', () => {
  const intent = parseIntent('A cozy study scene with warm lighting and headphones.');

  assert.equal(resolveStyleFamily(undefined, intent), 'lofi_aesthetic');
  assert.equal(resolveStyleFamily('retro_90s_cel', intent), 'retro_90s_cel');
});

test('prompt assembler adapts quality conventions by checkpoint family', () => {
  const intent = parseIntent('Draw a warrior girl standing on a cliff at sunset.');
  const expanded = expandTags(intent);

  const noobai = assemblePrompt('noobai-xl-vpred-v1.0', 'cinematic_niji', intent, expanded);
  const pony = assemblePrompt('pony-diffusion-v6-xl', 'cinematic_niji', intent, expanded);

  assert.match(noobai.positive, /masterpiece, best quality, absurdres/);
  assert.match(pony.positive, /score_9, score_8_up, score_7_up/);
  assert.match(pony.positive, /source_anime/);
});

test('parameter optimizer applies SDXL bucket defaults and overrides', () => {
  const parameters = optimizeParameters('cinematic_niji', 'noobai-xl-vpred-v1.0', {
    userId: 'usr_test',
    sessionId: 'sess_test',
    prompt: 'Draw a warrior girl at sunset.',
    parameterOverrides: {
      steps: 30,
      width: 1024,
      height: 1536,
    },
  });

  assert.equal(parameters.width, 1024);
  assert.equal(parameters.height, 1536);
  assert.equal(parameters.steps, 30);
  assert.equal(parameters.cfgScale, 5);
});

test('safety filter blocks configured banned terms', () => {
  const decision = evaluateImagePromptSafety('child sexual content', '');
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'blocked-term');
});

test('orchestrator constructs a GenerationRequest for the workflow builder seam', async () => {
  const orchestrator = new IonImageOrchestrator();
  const request = await orchestrator.processRequest({
    userId: 'usr_test',
    sessionId: 'sess_test',
    prompt: 'Draw a warrior girl standing on a cliff at sunset with a sword.',
  });

  assert.equal(request.userId, 'usr_test');
  assert.equal(request.model.checkpoint, 'noobai-xl-vpred-v1.0');
  assert.equal(request.prompt.qualityTags[0], 'masterpiece');
  assert.equal(request.ionMetadata.styleFamily, 'cinematic_niji');
  assert.equal(request.parameters.height, 1536);
  assert.equal(request.ionMetadata.reasoningChain.includes('workflow_build'), true);

  const reasoning = await orchestrator.getReasoningChain(request.requestId);
  assert.equal(reasoning.includes('submit'), true);
});