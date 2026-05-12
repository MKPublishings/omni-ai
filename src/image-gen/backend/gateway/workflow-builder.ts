import { getCheckpointConfig } from '../../config/models.config';
import { readImageGenEnvironment } from '../../config/env';
import { buildUniversalBaseGraph } from '../templates/universal-base-graph';
import type { ionWorkflow, GenerationRequest } from '../../shared/types';

const MAX_CLIP_TEXT_CHARS = 1400;
const DEFAULT_SDXL_MODEL = 'sd_xl_turbo_1.0_fp16.safetensors';

function hashToInt(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function isolateSeed(seed: number, nonce: string): number {
  const safeSeed = Number.isFinite(seed) ? Math.floor(seed) : 0;
  const delta = hashToInt(nonce) % 2_147_483_647;
  const mixed = (safeSeed ^ delta) % 2_147_483_647;
  return mixed > 0 ? mixed : delta || 1;
}

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
    return DEFAULT_SDXL_MODEL;
  }

  const sanitizedPath = raw.replace(/\\/g, '/');
  const filename = sanitizedPath.split('/').pop()?.trim() || raw;

  if (/\.(ckpt|pt|pth)$/i.test(filename)) {
    return filename;
  }

  return filename;
}

function buildPositiveText(request: GenerationRequest): string {
  const subjectAnchors = request.ionMetadata.subjectPriorityAnchors || [];

  const domainBiasTail =
    request.ionMetadata.subjectDomain === 'environment'
      ? ['expansive environmental scene', 'background and foreground separation']
      : request.ionMetadata.subjectDomain === 'architecture'
        ? ['structural perspective fidelity', 'architectural geometry coherence']
        : request.ionMetadata.subjectDomain === 'product'
          ? ['single object isolation', 'clean object silhouette']
          : [];

  return sanitizeClipText([
    ...subjectAnchors,
    request.ionMetadata.primarySubject || '',
    request.ionMetadata.originalUserPrompt || '',
    ...request.prompt.qualityTags,
    ...request.prompt.styleTags,
    request.prompt.positive,
    ...domainBiasTail,
  ]
    .filter(Boolean)
    .join(', '));
}

export function buildionWorkflow(request: GenerationRequest): ionWorkflow {
  const env = readImageGenEnvironment();
  const requestedCheckpoint = String(request.model.checkpoint || '').trim();
  const positiveText = buildPositiveText(request);
  const negativeText = sanitizeClipText(request.prompt.negative);

  if (!positiveText) {
    throw new Error('ION image generation aborted: empty positive prompt conditioning.');
  }

  const checkpoint = getCheckpointConfig(requestedCheckpoint || DEFAULT_SDXL_MODEL);
  const latentIsolationNonce = request.ionMetadata.latentIsolationNonce || request.requestId;
  const isolatedSeed = isolateSeed(request.parameters.seed, latentIsolationNonce);
  const domainNegativeTail =
    request.ionMetadata.subjectDomain === 'environment' || request.ionMetadata.subjectDomain === 'architecture'
      ? ', no closeup face, no portrait crop, no isolated headshot subject'
      : request.ionMetadata.subjectDomain === 'product'
        ? ', no human portrait, no face crop'
        : '';
  const effectiveNegativeText = sanitizeClipText(`${negativeText}${domainNegativeTail}`);
  const runtimeCheckpoint = normalizeRuntimeCheckpointName(
    requestedCheckpoint || checkpoint.runtimeCheckpoint || checkpoint.id || DEFAULT_SDXL_MODEL,
  );

  // Build using Universal Base Graph template
  const workflow = buildUniversalBaseGraph({
    checkpointName: runtimeCheckpoint,
    positivePrompt: positiveText,
    negativePrompt: effectiveNegativeText,
    width: request.parameters.width,
    height: request.parameters.height,
    batchSize: request.parameters.batchSize,
    seed: isolatedSeed,
    steps: request.parameters.steps,
    cfgScale: request.parameters.cfgScale,
    sampler: request.parameters.sampler,
    scheduler: request.parameters.scheduler,
    denoise: Number(request.parameters.denoise ?? env.defaultDenoise ?? 0.88),
    filenamePrefix: `ion-${request.requestId}-${latentIsolationNonce.slice(0, 8)}`,
    metadata: {
      request_id: request.requestId,
      checkpoint: checkpoint.id || DEFAULT_SDXL_MODEL,
      runtime_checkpoint: runtimeCheckpoint,
      prediction_type: checkpoint.predictionType,
      cfg_rescale: request.parameters.cfgRescale,
      denoise: Number(request.parameters.denoise ?? env.defaultDenoise ?? 0.88),
      clip_skip: request.model.clipSkip,
      style_family: request.ionMetadata.styleFamily,
      subject_domain: request.ionMetadata.subjectDomain || 'unknown',
      primary_subject: request.ionMetadata.primarySubject || '',
      subject_anchors: (request.ionMetadata.subjectPriorityAnchors || []).join(', '),
      render_path: request.ionMetadata.subjectDomain === 'portrait' ? 'portrait' : 'environment',
      latent_isolation_nonce: latentIsolationNonce,
      isolated_seed: isolatedSeed,
      original_prompt: request.ionMetadata.originalUserPrompt,
      negative_prompt: effectiveNegativeText,
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