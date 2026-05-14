import { getImageGenerationError } from '../../shared/error-codes';
import { hierarchyEngine, registerAllPoints } from 'ionirix-eight-point-hierarchy';
import type {
  GenerationRequest,
  IOrchestrator,
  ReasoningStepId,
  UserInput,
} from '../../shared/types';
import { parseIntent } from '../intent-parser';
import { optimizeModelConfig, optimizeParameters } from '../parameter-optimizer';
import { assemblePrompt } from '../prompt-assembler';
import { evaluateImagePromptSafety } from '../safety-filter';
import { resolveStyleFamily } from '../style-router';
import { expandTags } from '../tag-expander';
import { buildSubjectPriorityAnchors, classifySubjectDomain } from '../subject-domain-classifier';
import { readImageGenEnvironment } from '../../config/env';
import { buildIonImageExecutionPlan } from '../entity-capability-router';

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

const FORCED_CHECKPOINT = 'ion-citizen-xl-vpred-v2.0';

export class IonImageOrchestrator implements IOrchestrator {
  private readonly reasoningChains = new Map<string, ReasoningStepId[]>();
  private readonly env;

  constructor(source?: Record<string, unknown>) {
    this.env = readImageGenEnvironment(source);
  }

  // Helper: get the most common value in an array
  private mode<T>(arr: T[]): T {
    return arr.sort((a, b) =>
      arr.filter(v => v === a).length - arr.filter(v => v === b).length
    ).pop() as T;
  }

  async processRequest(userInput: UserInput): Promise<GenerationRequest> {
    // Step 1: Parse intent and build initial execution plan
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
    const checkpointId = FORCED_CHECKPOINT;
    const executionPlan = buildIonImageExecutionPlan({
      userInput,
      styleFamily,
      intent,
      maxConcurrentJobs: this.env.maxConcurrentJobs,
    });

    // Step 2: Consensus aggregation across entities using Ionirix Eight-Point Hierarchy
    // Ensure hierarchy engine is initialized and all points are registered
    if (!hierarchyEngine.getRegistry().getAll().length) {
      await registerAllPoints();
    }

    let consensusIntent = { ...intent };
    if (executionPlan && Array.isArray(executionPlan.entities) && executionPlan.entities.length > 1) {
      // Map each entity intent to a constitutional Point and feature (for demo, use P2-operational/workflow-orchestration)
      const mergedPayloads = executionPlan.entities.map((entity, idx) => ({
        ...intent,
        entityId: entity.agentId || idx,
        // Extend here for entity-specific intent if available
      }));

      // Emit a hierarchy event for each entity intent (simulate operational workflow merge)
      const mergeResults = await Promise.all(
        mergedPayloads.map(payload =>
          hierarchyEngine.execute({
            pointId: 'P2',
            featureId: 'workflow-orchestration',
            payload
          })
        )
      );

      // Merge results into a unified consensus intent (for now, take the most common subject/action/mood)
      const allSubjects = mergeResults.map(r => r.result.artifact).filter(Boolean);
      const allActions = mergedPayloads.map(p => p.action).filter(Boolean);
      const allMoods = mergedPayloads.map(p => p.mood).filter(Boolean);
      const allCompositions = [userInput.compositionPreset || inferredCompositionPreset];
      consensusIntent.subject = this.mode(allSubjects);
      consensusIntent.action = this.mode(allActions);
      consensusIntent.mood = this.mode(allMoods);
      const consensusComposition = this.mode(allCompositions);
      userInput.compositionPreset = consensusComposition;
    }

    // Step 3: Use consensus intent for prompt assembly
    const expanded = expandTags(consensusIntent);
    const prompt = assemblePrompt(checkpointId, styleFamily, consensusIntent, expanded, {
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
        primarySubject: consensusIntent.subject,
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
