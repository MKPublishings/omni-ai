import { getCheckpointConfig } from '../../config/models.config';
import { buildUniversalBaseGraph } from '../templates/universal-base-graph';
import type { ComfyUIWorkflow, GenerationRequest } from '../../shared/types';

function normalizeRuntimeCheckpointName(input: string): string {
  const raw = String(input || '').trim();
  if (!raw) {
    return 'v1-5-pruned-emaonly-fp16.safetensors';
  }

  const sanitizedPath = raw.replace(/\\/g, '/');
  const filename = sanitizedPath.split('/').pop()?.trim() || raw;

  if (/\.(safetensors|ckpt|pt|pth)$/i.test(filename)) {
    return filename;
  }

  return `${filename}.safetensors`;
}

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
  // Prefer explicit request checkpoint names to avoid accidental fallback remaps.
  const requestedCheckpoint = String(request.model.checkpoint || '').trim();
  const checkpoint = getCheckpointConfig(requestedCheckpoint || 'v1-5-pruned-emaonly-fp16');
  const runtimeCheckpoint = normalizeRuntimeCheckpointName(
    requestedCheckpoint || checkpoint.runtimeCheckpoint || checkpoint.id || 'v1-5-pruned-emaonly-fp16',
  );
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
      checkpoint: checkpoint.id || 'v1-5-pruned-emaonly-fp16',
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