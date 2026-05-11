import { getCheckpointConfig } from '../../config/models.config';
import { buildUniversalBaseGraph } from '../templates/universal-base-graph';
import type { ComfyUIWorkflow, GenerationRequest } from '../../shared/types';

const MAX_CLIP_TEXT_CHARS = 1400;
const DEFAULT_GROK_MODEL = 'grok-imagine-image-beta';
const GROK_ASPECT_CHOICES = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '9:19.5', '19.5:9', '9:20', '20:9', '1:2', '2:1'] as const;

function sanitizeClipText(input: string): string {
  const normalized = String(input || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return '';
  }

  if (normalized.length <= MAX_CLIP_TEXT_CHARS) {
    return normalized;
  }

  const clipped = normalized.slice(0, MAX_CLIP_TEXT_CHARS);
  const lastComma = clipped.lastIndexOf(',');
  if (lastComma > 200) {
    return clipped.slice(0, lastComma).trim();
  }

  return clipped.trim();
}

function normalizeRuntimeCheckpointName(input: string): string {
  const raw = String(input || '').trim();
  if (!raw) {
    return DEFAULT_GROK_MODEL;
  }

  const sanitizedPath = raw.replace(/\\/g, '/');
  const filename = sanitizedPath.split('/').pop()?.trim() || raw;

  if (/\.(ckpt|pt|pth)$/i.test(filename)) {
    return filename;
  }

  return filename;
}

function isGrokModel(modelName: string): boolean {
  return /^grok-imagine-image/i.test(String(modelName || '').trim());
}

function chooseClosestAspectRatio(width: number, height: number): string {
  if (!(Number.isFinite(width) && Number.isFinite(height)) || width <= 0 || height <= 0) {
    return '9:16';
  }

  const target = width / height;
  let best = '9:16';
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of GROK_ASPECT_CHOICES) {
    const [w, h] = candidate.split(':').map(Number);
    if (!(w > 0 && h > 0)) {
      continue;
    }

    const distance = Math.abs(target - (w / h));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  return best;
}

function chooseGrokResolution(width: number, height: number): '1K' | '2K' {
  const longestSide = Math.max(Number(width) || 0, Number(height) || 0);
  return longestSide > 1536 ? '2K' : '1K';
}

function buildGrokWorkflow(request: GenerationRequest, modelName: string, promptText: string): ComfyUIWorkflow {
  const model = String(modelName || DEFAULT_GROK_MODEL).trim() || DEFAULT_GROK_MODEL;
  const aspectRatio = chooseClosestAspectRatio(request.parameters.width, request.parameters.height);
  const resolution = chooseGrokResolution(request.parameters.width, request.parameters.height);
  const batchSize = Math.max(1, Number(request.parameters.batchSize) || 1);
  const seed = Number.isFinite(request.parameters.seed)
    ? Number(request.parameters.seed)
    : Math.floor(Math.random() * 2_147_483_647);

  return {
    '1': {
      class_type: 'GrokImageNode',
      inputs: {
        model,
        prompt: promptText,
        aspect_ratio: aspectRatio,
        number_of_images: batchSize,
        seed,
        resolution,
      },
    },
    '2': {
      class_type: 'SaveImage',
      inputs: {
        filename_prefix: `ion-${request.requestId}`,
        images: ['1', 0],
      },
    },
    metadata: {
      template: 'grok-direct-graph',
      request_id: request.requestId,
      model,
      aspect_ratio: aspectRatio,
      resolution,
      number_of_images: batchSize,
      seed,
      style_family: request.ionMetadata.styleFamily,
      original_prompt: request.ionMetadata.originalUserPrompt,
    },
  } as unknown as ComfyUIWorkflow;
}

function buildPositiveText(request: GenerationRequest): string {
  return sanitizeClipText([
    ...request.prompt.qualityTags,
    ...request.prompt.styleTags,
    request.prompt.positive,
  ]
    .filter(Boolean)
    .join(', '));
}

export function buildComfyUIWorkflow(request: GenerationRequest): ComfyUIWorkflow {
  const requestedCheckpoint = String(request.model.checkpoint || '').trim();
  const positiveText = buildPositiveText(request);
  const negativeText = sanitizeClipText(request.prompt.negative);

  if (!positiveText) {
    throw new Error('ION image generation aborted: empty positive prompt conditioning.');
  }

  if (isGrokModel(requestedCheckpoint)) {
    return buildGrokWorkflow(request, requestedCheckpoint, positiveText);
  }

  const checkpoint = getCheckpointConfig(requestedCheckpoint || DEFAULT_GROK_MODEL);
  const runtimeCheckpoint = normalizeRuntimeCheckpointName(
    requestedCheckpoint || checkpoint.runtimeCheckpoint || checkpoint.id || DEFAULT_GROK_MODEL,
  );

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
      checkpoint: checkpoint.id || DEFAULT_GROK_MODEL,
      runtime_checkpoint: runtimeCheckpoint,
      prediction_type: checkpoint.predictionType,
      cfg_rescale: request.parameters.cfgRescale,
      clip_skip: request.model.clipSkip,
      style_family: request.ionMetadata.styleFamily,
      original_prompt: request.ionMetadata.originalUserPrompt,
      negative_prompt: negativeText,
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