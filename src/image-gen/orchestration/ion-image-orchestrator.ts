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
import { readImageGenEnvironment } from '../config/env';

const DEFAULT_REASONING_CHAIN: ReasoningStepId[] = [
  'intent_parse',
  'profile_check',
  'style_infer',
  'tag_expand',
  'quality_inject',
  'negative_assemble',
  'param_optimize',
  'safety_gate',
  'workflow_build',
  'submit',
];

export class IonImageOrchestrator implements IOrchestrator {
  private readonly reasoningChains = new Map<string, ReasoningStepId[]>();
  private readonly env = readImageGenEnvironment();

  async processRequest(userInput: UserInput): Promise<GenerationRequest> {
    const intent = parseIntent(userInput.prompt);
    const styleFamily = resolveStyleFamily(userInput.styleFamily, intent);
    const checkpointId = userInput.checkpoint || this.env.defaultCheckpoint;
    const expanded = expandTags(intent);
    const prompt = assemblePrompt(checkpointId, styleFamily, intent, expanded);
    const safety = evaluateImagePromptSafety(prompt.positive, prompt.negative);

    if (!safety.allowed) {
      const blocked = getImageGenerationError('E_SAFETY_BLOCK');
      const error = new Error(blocked.message);
      error.name = blocked.code;
      throw error;
    }

    const requestId = crypto.randomUUID();
    const model = optimizeModelConfig(checkpointId, userInput);
    const parameters = optimizeParameters(styleFamily, checkpointId, userInput);

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
      },
    };
  }

  async getReasoningChain(requestId: string): Promise<ReasoningStepId[]> {
    return this.reasoningChains.get(requestId) || [];
  }
}