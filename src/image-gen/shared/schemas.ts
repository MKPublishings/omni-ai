import { z } from 'zod';
import {
  IMAGE_GENERATION_PRIORITIES,
  IMAGE_JOB_STATUSES,
  IMAGE_OUTPUT_FORMATS,
  IMAGE_PREDICTION_TYPES,
  IMAGE_SAMPLERS,
  IMAGE_SCHEDULERS,
  ION_IMAGE_EXECUTION_CAPABILITIES,
  REASONING_STEP_IDS,
  STYLE_FAMILY_IDS,
} from './types';

export const loraConfigSchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(0).max(1.5),
});

export const stylePresetSchema = z.object({
  id: z.enum(STYLE_FAMILY_IDS),
  name: z.string().min(1),
  description: z.string().min(1),
  exampleThumbnail: z.string().min(1),
  positivePrefix: z.string().min(1),
  negativeAdditions: z.string().min(1),
  sampler: z.enum(IMAGE_SAMPLERS),
  steps: z.number().int().min(1).max(100),
  cfgScale: z.number().min(1).max(20),
  defaultResolution: z.object({
    width: z.number().int().min(256).max(4096),
    height: z.number().int().min(256).max(4096),
  }),
  checkpointOverride: z.string().min(1).optional(),
  loraStack: z.array(loraConfigSchema).optional(),
});

export const checkpointConfigSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  baseModelFamily: z.string().min(1),
  predictionType: z.enum(IMAGE_PREDICTION_TYPES),
  vae: z.string().min(1),
  qualityTags: z.array(z.string().min(1)).min(1),
  sourceTag: z.string().min(1).optional(),
  recommendedSampler: z.enum(IMAGE_SAMPLERS),
  recommendedScheduler: z.enum(IMAGE_SCHEDULERS),
  recommendedCfgScale: z.number().min(1).max(20),
  recommendedCfgRescale: z.number().min(0).max(1).optional(),
  recommendedSteps: z.number().int().min(1).max(100),
  clipSkip: z.number().int().min(1).max(12),
  defaultResolution: z.object({
    width: z.number().int().min(256).max(4096),
    height: z.number().int().min(256).max(4096),
  }),
});

export const generationParametersSchema = z.object({
  width: z.number().int().min(256).max(4096),
  height: z.number().int().min(256).max(4096),
  steps: z.number().int().min(1).max(100),
  cfgScale: z.number().min(1).max(20),
  cfgRescale: z.number().min(0).max(1),
  sampler: z.enum(IMAGE_SAMPLERS),
  scheduler: z.enum(IMAGE_SCHEDULERS),
  seed: z.number().int(),
  batchSize: z.number().int().min(1).max(8),
});

export const generationRequestSchema = z.object({
  requestId: z.string().uuid(),
  userId: z.string().min(1),
  sessionId: z.string().min(1),
  priority: z.enum(IMAGE_GENERATION_PRIORITIES),
  timestamp: z.string().datetime(),
  prompt: z.object({
    positive: z.string().min(1),
    negative: z.string(),
    qualityTags: z.array(z.string().min(1)),
    styleTags: z.array(z.string().min(1)),
  }),
  model: z.object({
    checkpoint: z.string().min(1),
    predictionType: z.enum(IMAGE_PREDICTION_TYPES),
    vae: z.string().min(1),
    loras: z.array(loraConfigSchema),
    clipSkip: z.number().int().min(1).max(12),
  }),
  parameters: generationParametersSchema,
  postProcessing: z.object({
    upscale: z.object({
      enabled: z.boolean(),
      model: z.string().min(1),
      scale: z.number().min(1).max(4),
    }),
    format: z.enum(IMAGE_OUTPUT_FORMATS),
    quality: z.number().int().min(1).max(100),
    embedMetadata: z.boolean(),
    generateThumbnail: z.boolean(),
  }),
  ionMetadata: z.object({
    reasoningChain: z.array(z.enum(REASONING_STEP_IDS)).min(1),
    originalUserPrompt: z.string().min(1),
    styleFamily: z.enum(STYLE_FAMILY_IDS),
    inferredMood: z.string().min(1),
    confidence: z.number().min(0).max(1),
    executionPlan: z
      .object({
        ticketId: z.string().min(1),
        planner: z.string().min(1),
        priority: z.string().min(1),
        departments: z.array(z.string().min(1)).min(1),
        capabilities: z.array(z.enum(ION_IMAGE_EXECUTION_CAPABILITIES)).min(1),
        estimatedParallelism: z.number().int().min(1),
        simulationSupportEnabled: z.boolean(),
        entities: z.array(
          z.object({
            agentId: z.string().min(1),
            role: z.string().min(1),
            department: z.string().min(1),
            capability: z.enum(ION_IMAGE_EXECUTION_CAPABILITIES),
            shardId: z.string().min(1),
            rationale: z.string().min(1),
          }),
        ),
      })
      .optional(),
  }),
});

export const generationResponseSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(['completed', 'failed', 'partial']),
  images: z.array(
    z.object({
      url: z.string().min(1),
      thumbnailUrl: z.string().min(1),
      width: z.number().int().min(1),
      height: z.number().int().min(1),
      format: z.enum(IMAGE_OUTPUT_FORMATS),
      sizeBytes: z.number().int().min(1),
      seed: z.number().int(),
    })
  ),
  timing: z.object({
    queueMs: z.number().min(0),
    modelLoadMs: z.number().min(0),
    inferenceMs: z.number().min(0),
    postProcessingMs: z.number().min(0),
    totalMs: z.number().min(0),
  }),
  modelInfo: z.object({
    checkpoint: z.string().min(1),
    predictionType: z.enum(IMAGE_PREDICTION_TYPES),
    lorasApplied: z.array(z.string()),
    actualSteps: z.number().int().min(1),
    actualCfg: z.number().min(0),
    vae: z.string().min(1),
  }),
  error: z
    .object({
      code: z.string().min(1),
      message: z.string().min(1),
      retriable: z.boolean(),
      suggestedAction: z.string().min(1),
    })
    .nullable(),
});

export const progressEventSchema = z.object({
  promptId: z.string().min(1),
  status: z.enum(IMAGE_JOB_STATUSES),
  step: z.number().int().min(0),
  totalSteps: z.number().int().min(0),
  queuePosition: z.number().int().min(0).optional(),
  previewImageUrl: z.string().min(1).optional(),
});