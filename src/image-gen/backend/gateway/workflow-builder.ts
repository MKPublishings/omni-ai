import { getCheckpointConfig } from '../../config/models.config';
import type { ComfyUIWorkflow, GenerationRequest } from '../../shared/types';

function buildPositiveText(request: GenerationRequest): string {
  return [
    ...request.prompt.qualityTags,
    ...request.prompt.styleTags,
    request.prompt.positive,
  ]
    .filter(Boolean)
    .join(', ');
}

export function buildComfyUIWorkflow(request: GenerationRequest): ComfyUIWorkflow {
  const checkpoint = getCheckpointConfig(request.model.checkpoint);
  const positiveText = buildPositiveText(request);
  const negativeText = request.prompt.negative;

  const workflow: ComfyUIWorkflow = {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: {
        ckpt_name: checkpoint.id,
      },
    },
    '2': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: positiveText,
        clip: ['1', 1],
      },
    },
    '3': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: negativeText,
        clip: ['1', 1],
      },
    },
    '4': {
      class_type: 'EmptyLatentImage',
      inputs: {
        width: request.parameters.width,
        height: request.parameters.height,
        batch_size: request.parameters.batchSize,
      },
    },
    '5': {
      class_type: 'KSampler',
      inputs: {
        seed: request.parameters.seed,
        steps: request.parameters.steps,
        cfg: request.parameters.cfgScale,
        sampler_name: request.parameters.sampler,
        scheduler: request.parameters.scheduler,
        denoise: 1,
        model: ['1', 0],
        positive: ['2', 0],
        negative: ['3', 0],
        latent_image: ['4', 0],
      },
    },
    '6': {
      class_type: 'VAEDecode',
      inputs: {
        samples: ['5', 0],
        vae: ['1', 2],
      },
    },
    '7': {
      class_type: 'SaveImage',
      inputs: {
        filename_prefix: `ion-${request.requestId}`,
        images: ['6', 0],
      },
    },
    metadata: {
      request_id: request.requestId,
      checkpoint: checkpoint.id,
      prediction_type: checkpoint.predictionType,
      cfg_rescale: request.parameters.cfgRescale,
      clip_skip: request.model.clipSkip,
      style_family: request.ionMetadata.styleFamily,
      original_prompt: request.ionMetadata.originalUserPrompt,
    },
  };

  if (checkpoint.predictionType === 'v_prediction') {
    workflow['8'] = {
      class_type: 'ModelSamplingDiscrete',
      inputs: {
        model: ['1', 0],
        sampling: 'v_prediction',
        zsnr: true,
      },
    };

    (workflow['5'] as Record<string, unknown>).inputs = {
      ...((workflow['5'] as Record<string, any>).inputs || {}),
      model: ['8', 0],
    };
  }

  return workflow;
}