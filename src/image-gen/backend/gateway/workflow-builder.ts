import { getCheckpointConfig } from '../../config/models.config';
import { buildUniversalBaseGraph } from '../templates/universal-base-graph';
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
  const runtimeCheckpoint = checkpoint.runtimeCheckpoint || checkpoint.id;
  const positiveText = buildPositiveText(request);
  const negativeText = request.prompt.negative;

  // Build using Universal Base Graph template
  const workflow = buildUniversalBaseGraph({
    checkpointName: runtimeCheckpoint,
    positivePrompt: positiveText,
    negativePrompt: negativeText,
    width: request.parameters.width,
    height: request.parameters.height,
    batchSize: request.parameters.batchSize,
    seed: request.parameters.seed,
    steps: request.parameters.steps,
    cfgScale: request.parameters.cfgScale,
    sampler: request.parameters.sampler,
    scheduler: request.parameters.scheduler,
    denoise: 1,
    filenamePrefix: `ion-${request.requestId}`,
    metadata: {
      request_id: request.requestId,
      checkpoint: checkpoint.id,
      runtime_checkpoint: runtimeCheckpoint,
      prediction_type: checkpoint.predictionType,
      cfg_rescale: request.parameters.cfgRescale,
      clip_skip: request.model.clipSkip,
      style_family: request.ionMetadata.styleFamily,
      original_prompt: request.ionMetadata.originalUserPrompt,
    },
  });

  // Inject v_prediction model sampling if needed
  if (checkpoint.predictionType === 'v_prediction') {
    (workflow as any)['8'] = {
      class_type: 'ModelSamplingDiscrete',
      inputs: {
        model: ['1', 0],
        sampling: 'v_prediction',
        zsnr: true,
      },
    };

    // Update sampler to use the discrete sampling node
    ((workflow as any)['5'] as any).inputs.model = ['8', 0];
  }

  return workflow;
}