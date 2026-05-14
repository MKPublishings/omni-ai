import {
  buildIonImagePromptAnalytics,
} from '../post-processing/ion-image-post-processor';
import {
  bytesToBase64,
  normalizeGeneratedImageOutput,
} from '../../shared/image-output';
import {
  ION_IMAGE_DEFAULT_QUALITY,
  ION_IMAGE_DEFAULT_RATIO,
} from './ion-image-legacy-generation-service';
import {
  createIonImageGenerationLog,
  emitIonImageGenerationLog,
} from '../logging/ion-image-telemetry';
import {
  buildIonImageV2RouteResponse,
  type BuildIonImageV2RouteResponseInput,
} from './ion-image-route-format';
import type { IonImageV2RouteResponse } from '../shared/types';

export interface BuildIonImageV2RouteResultInput extends Omit<BuildIonImageV2RouteResponseInput, 'imageDataUrl' | 'filename' | 'mimeType' | 'quality' | 'ratio'> {
  totalMs: number;
  quality?: string;
  ratio?: string;
}

export interface IonImageV2RouteResult {
  body: IonImageV2RouteResponse;
  headers: Record<string, string>;
}

function greatestCommonDivisor(a: number, b: number): number {
  let left = Math.abs(Math.trunc(a));
  let right = Math.abs(Math.trunc(b));
  while (right !== 0) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }
  return left || 1;
}

function buildImageRatioLabel(width: number, height: number): string {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return ION_IMAGE_DEFAULT_RATIO;
  }

  const divisor = greatestCommonDivisor(width, height);
  return `${Math.trunc(width / divisor)}:${Math.trunc(height / divisor)}`;
}

function normalizeRoutePresentation(input: BuildIonImageV2RouteResultInput): { quality: string; ratio: string } {
  const normalizedQuality = String(input.quality || '').trim() || ION_IMAGE_DEFAULT_QUALITY;
  const normalizedRatio = String(input.ratio || '').trim() || buildImageRatioLabel(
    input.pipelineResult.request.parameters.width,
    input.pipelineResult.request.parameters.height,
  );

  return {
    quality: normalizedQuality,
    ratio: normalizedRatio,
  };
}

function extensionFromMimeType(mimeType: string): string {
  const normalized = String(mimeType || '').trim().toLowerCase()
  if (normalized === 'image/svg+xml') {
    return 'svg'
  }

  if (normalized === 'image/jpeg' || normalized === 'image/jpg') {
    return 'jpg'
  }

  if (normalized === 'image/webp') {
    return 'webp'
  }

  return 'png'
}

function normalizeModelLabel(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) {
    return 'model';
  }

  const fileLike = raw.split(/[\\/]/).pop() || raw;
  const stem = fileLike.replace(/\.(safetensors|ckpt|pt|pth)$/i, '');
  const compact = stem.replace(/[^a-zA-Z0-9._-]/g, '_');
  return compact || 'model';
}

function makeIonImageFilename(modelLabel: string, mimeType: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeModel = normalizeModelLabel(modelLabel);
  return `ionirix_${safeModel}_${timestamp}.${extensionFromMimeType(mimeType)}`;
}

export async function buildIonImageV2RouteResult(
  input: BuildIonImageV2RouteResultInput,
): Promise<IonImageV2RouteResult> {
  const presentation = normalizeRoutePresentation(input);
  const normalized = await normalizeGeneratedImageOutput(input.pipelineResult.imageBytes);
  const imageDataUrl = `data:${normalized.mimeType};base64,${bytesToBase64(normalized.bytes)}`;
  const filename = makeIonImageFilename(
    input.pipelineResult.outputModel || input.pipelineResult.request.model.checkpoint,
    normalized.mimeType,
  );

  const body = buildIonImageV2RouteResponse({
    ...input,
    quality: presentation.quality,
    ratio: presentation.ratio,
    imageDataUrl,
    filename,
    mimeType: normalized.mimeType,
  });

  emitIonImageGenerationLog(
    createIonImageGenerationLog({
      requestId: input.pipelineResult.request.requestId,
      jobId: `sync-${input.pipelineResult.request.requestId}`,
      promptId: input.pipelineResult.promptId,
      status: 'completed',
      gateway: input.pipelineResult.gatewayKind,
      checkpoint: input.pipelineResult.request.model.checkpoint,
      styleFamily: input.pipelineResult.request.ionMetadata.styleFamily,
      artifactCount: 1,
      postProcessingMs: 0,
      totalMs: input.totalMs,
      promptAnalytics: buildIonImagePromptAnalytics(input.pipelineResult.request),
      error: null,
    }),
  );

  return {
    body,
    headers: {
      'Content-Type': 'application/json',
      'X-ION-Image-Model': input.pipelineResult.outputModel,
      'X-ION-Image-Route': 'image-gen-v2',
      'Access-Control-Expose-Headers': 'X-ION-Image-Model',
    },
  };
}