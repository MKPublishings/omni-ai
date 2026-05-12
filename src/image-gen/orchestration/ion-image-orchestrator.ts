import { getImageGenerationError } from '../shared/error-codes';
import type {
  GenerationRequest,
  IOrchestrator,
  ReasoningStepId,
  UserInput,
} from '../shared/types';
import { parseIntent } from './intent-parser';
import { optimizeModelConfig, optimizeParameters } from './parameter-optimizer';
import { assemblePrompt } from './prompt-assembler';
import { evaluateImagePromptSafety } from './safety-filter';
import { resolveStyleFamily } from './style-router';
import { expandTags } from './tag-expander';
import { buildSubjectPriorityAnchors, classifySubjectDomain } from './subject-domain-classifier';
import { readImageGenEnvironment } from '../config/env';
import { buildIonImageExecutionPlan } from './entity-capability-router';

const DEFAULT_REASONING_CHAIN: ReasoningStepId[] = [
  'intent_parse',
  'profile_check',
  'style_infer',
  'tag_expand',
  'quality_inject',
  'negative_assemble',
  'param_optimize',
  'safety_gate',
  'entity_allocate',
  'workflow_build',
  'submit',
];

export class IonImageOrchestrator implements IOrchestrator {
  private readonly reasoningChains = new Map<string, ReasoningStepId[]>();
  private readonly env;

  constructor(source?: Record<string, unknown>) {
    this.env = readImageGenEnvironment(source);
  }

  async processRequest(userInput: UserInput): Promise<GenerationRequest> {
    const intent = parseIntent(userInput.prompt);
    const styleFamily = resolveStyleFamily(userInput.styleFamily, intent);
    const subjectDomain = classifySubjectDomain(intent);
    const subjectPriorityAnchors = buildSubjectPriorityAnchors(intent, subjectDomain);
    const inferredCompositionPreset =
      subjectDomain === 'portrait'
        ? 'portrait'
        : subjectDomain === 'environment' || subjectDomain === 'architecture'
          ? 'cinematic'
          : undefined;
    const lowerPrompt = String(userInput.prompt || '').toLowerCase();
    const isPhotorealLandscapePrompt =
      /(photo[-\s]?realistic|photorealistic|realistic|cinema photo|dslr|natural light)/.test(lowerPrompt)
      && /(desert|landscape|vista|panorama|mountain|forest|cityscape|street scene|skyline|ocean|beach|valley|canyon|dune|oasis)/.test(lowerPrompt);
    const checkpointId = userInput.checkpoint
      || (isPhotorealLandscapePrompt ? 'sd_xl_turbo_1.0_fp16.safetensors' : this.env.defaultCheckpoint);
    const expanded = expandTags(intent);
    const prompt = assemblePrompt(checkpointId, styleFamily, intent, expanded, {
      variationMode: userInput.variationMode,
      anatomyStrictMode: userInput.anatomyStrictMode,
      styleProfile: userInput.styleProfile,
    });
    const safety = evaluateImagePromptSafety(prompt.positive, prompt.negative);

    if (!safety.allowed) {
      const blocked = getImageGenerationError('E_SAFETY_BLOCK');
      const error = new Error(blocked.message);
      error.name = blocked.code;
      throw error;
    }

    const requestId = crypto.randomUUID();
    const model = optimizeModelConfig(checkpointId, userInput);
    const parameters = optimizeParameters(styleFamily, checkpointId, {
      ...userInput,
      compositionPreset: userInput.compositionPreset || prompt.compositionPreset || inferredCompositionPreset,
    });

    if (isPhotorealLandscapePrompt) {
      parameters.batchSize = 1;
    }

    const executionPlan = buildIonImageExecutionPlan({
      userInput,
      styleFamily,
      intent,
      maxConcurrentJobs: this.env.maxConcurrentJobs,
    });

    this.reasoningChains.set(requestId, [...DEFAULT_REASONING_CHAIN]);

    return {
      requestId,
      userId: userInput.userId,
      sessionId: userInput.sessionId,
      priority: userInput.priority || 'interactive',
      timestamp: new Date().toISOString(),
      prompt,
      model,
      parameters,
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
        reasoningChain: [...DEFAULT_REASONING_CHAIN],
        originalUserPrompt: userInput.prompt,
        styleFamily,
        inferredMood: expanded.inferredMood,
        confidence: 0.9,
        subjectDomain,
        primarySubject: intent.subject,
        subjectPriorityAnchors,
        latentIsolationNonce: requestId,
        styleProfileId: prompt.styleProfileId,
        compositionPreset: userInput.compositionPreset || prompt.compositionPreset || inferredCompositionPreset,
        anatomyStrictMode: Boolean(userInput.anatomyStrictMode),
        kimonoMode: prompt.kimonoMode,
        executionPlan,
      },
    };
  }

  async getReasoningChain(requestId: string): Promise<ReasoningStepId[]> {
    return this.reasoningChains.get(requestId) || [];
  }
}