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

test('photorealistic environment prompts preserve non-human subject intent', () => {
  const intent = parseIntent('Photo-realistic desert at golden hour with wind-swept dunes, wide shot.');
  const styleFamily = resolveStyleFamily(undefined, intent);
  const expanded = expandTags(intent);

  assert.equal(intent.subject, 'desert');
  assert.equal(intent.framing, 'wide shot');
  assert.equal(styleFamily, 'semi_realistic_2_5d');
  assert.equal(expanded.tags.includes('desert'), true);
  assert.equal(expanded.tags.includes('wide_shot'), true);
});

test('orchestrator routes environment prompts through non-portrait path metadata', async () => {
  const orchestrator = new IonImageOrchestrator();
  const request = await orchestrator.processRequest({
    userId: 'usr_test',
    sessionId: 'sess_test',
    prompt: 'Photo-realistic desert with architectural ruins, panoramic landscape.',
  });

  assert.equal(request.ionMetadata.subjectDomain === 'environment' || request.ionMetadata.subjectDomain === 'architecture' || request.ionMetadata.subjectDomain === 'mixed', true);
  assert.equal(request.ionMetadata.compositionPreset, 'cinematic');
  assert.equal((request.ionMetadata.subjectPriorityAnchors || []).length > 0, true);
});

test('prompt assembler adapts quality conventions by checkpoint family', () => {
  const intent = parseIntent('Draw a warrior girl standing on a cliff at sunset.');
  const expanded = expandTags(intent);

    const citizenPrompt = assemblePrompt('ion-citizen-xl-vpred-v2.0', 'cinematic_niji', intent, expanded);
  const pony = assemblePrompt('pony-diffusion-v6-xl', 'cinematic_niji', intent, expanded);

    assert.match(citizenPrompt.positive, /masterpiece, best quality, absurdres/);
  assert.match(pony.positive, /score_9, score_8_up, score_7_up/);
  assert.match(pony.positive, /source_anime/);
});

test('parameter optimizer applies SDXL bucket defaults and overrides', () => {
  const parameters = optimizeParameters('cinematic_niji', 'ion-citizen-xl-vpred-v2.0', {
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

test('parameter optimizer raises render settings for photogrammetry portrait prompts', () => {
  const parameters = optimizeParameters('semi_realistic_2_5d', 'ion-citizen-xl-vpred-v2.0', {
    userId: 'usr_test',
    sessionId: 'sess_test',
    prompt: 'Photorealistic portrait of a person in natural light.',
  });

  assert.equal(parameters.steps, 32);
  assert.equal(parameters.cfgScale, 7);
  assert.equal(parameters.sampler, 'dpmpp_2m_sde_heun');
  assert.equal(parameters.scheduler, 'karras');
});

test('safety filter blocks configured banned terms', () => {
  const decision = evaluateImagePromptSafety('child sexual content', '');
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'blocked-term');
});

test('safety filter contextually allows benign anime prompts', () => {
  const decision = evaluateImagePromptSafety('anime character design, cinematic lighting, detailed background', '');
  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, 'contextual-anime-safe');
});

test('orchestrator constructs a GenerationRequest for the workflow builder seam', async () => {
  const orchestrator = new IonImageOrchestrator();
  const request = await orchestrator.processRequest({
    userId: 'usr_test',
    sessionId: 'sess_test',
    prompt: 'Draw a warrior girl standing on a cliff at sunset with a sword.',
  });

  assert.equal(request.userId, 'usr_test');
  assert.equal(request.model.checkpoint, 'ion-citizen-xl-vpred-v2.0');
  assert.equal(request.prompt.qualityTags[0], 'masterpiece');
  assert.equal(request.ionMetadata.styleFamily, 'cinematic_niji');
  assert.equal(request.parameters.height, 1536);
  assert.equal(request.ionMetadata.reasoningChain.includes('workflow_build'), true);
  assert.equal(request.ionMetadata.reasoningChain.includes('entity_allocate'), true);
  assert.equal((request.ionMetadata.executionPlan?.entities.length || 0) > 0, true);
  assert.equal(request.ionMetadata.executionPlan?.capabilities.includes('render'), true);

  const reasoning = await orchestrator.getReasoningChain(request.requestId);
  assert.equal(reasoning.includes('submit'), true);
});

test('orchestrator injects photogrammetry controls for realistic portrait prompts', async () => {
  const orchestrator = new IonImageOrchestrator();
  const request = await orchestrator.processRequest({
    userId: 'usr_test',
    sessionId: 'sess_test',
    prompt: 'Photorealistic portrait of a person in natural light.',
  });

  assert.match(request.prompt.positive, /photogrammetry-grade scene reconstruction/i);
  assert.match(request.prompt.positive, /single clearly isolated subject/i);
  assert.match(request.prompt.negative, /no overlapping anatomy/i);
  assert.match(request.prompt.negative, /no hidden eyes/i);
  assert.equal(request.parameters.steps, 32);
  assert.equal(request.parameters.cfgScale, 7);
  assert.equal(request.parameters.sampler, 'dpmpp_2m_sde_heun');
});

test('kimono strict mode injects anatomy guidance and composition defaults', async () => {
  const orchestrator = new IonImageOrchestrator();
  const request = await orchestrator.processRequest({
    userId: 'usr_test',
    sessionId: 'sess_test',
    prompt: 'Adult woman in traditional kimono under cherry blossoms with visible hands and detailed fingers.',
    anatomyStrictMode: true,
    variationMode: 'high',
    styleProfile: 'twilight_festival',
  });

  assert.equal(request.ionMetadata.kimonoMode, true);
  assert.equal(request.ionMetadata.styleProfileId, 'twilight_festival');
  assert.equal(request.ionMetadata.compositionPreset, 'full_body');
  assert.equal(request.parameters.width, 896);
  assert.equal(request.parameters.height, 1536);
  assert.equal(request.parameters.steps >= 30, true);
  assert.match(request.prompt.positive, /correct kimono wrap/i);
  assert.match(request.prompt.negative, /incorrect kimono wrap/i);
});