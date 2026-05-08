import { getImageGenerationError } from '../shared/error-codes';
import type {
  GeneratedImageRecord,
  GenerationResponse,
  IImageArtifactStorage,
  IImageJobQueue,
  ImageGenerationError,
  IonImagePostProcessingSummary,
  IonImagePromptAnalytics,
  IonImageQueueMetadataPayload,
  ImageQueueJobRecord,
  StoredImageArtifact,
} from '../shared/types';
import { executeIonImagePipelineRequest } from './ion-image-pipeline';
import {
  buildIonImagePostProcessingSummary,
  buildIonImagePromptAnalytics,
} from '../post-processing/ion-image-post-processor';
import {
  createIonImageGenerationLog,
  emitIonImageGenerationLog,
} from '../logging/ion-image-telemetry';

type EnvironmentSource = Record<string, unknown>;

function toImageError(error: unknown): ImageGenerationError {
  const name = String((error as Error)?.name || '').trim().toUpperCase();
  if (name === 'E_TIMEOUT') return getImageGenerationError('E_TIMEOUT');
  if (name === 'E_COMFYUI_DOWN') return getImageGenerationError('E_COMFYUI_DOWN');
  if (name === 'E_SAFETY_BLOCK') return getImageGenerationError('E_SAFETY_BLOCK');

  return {
    code: 'E_POST_PROCESS',
    message: String((error as Error)?.message || 'Image job runner failed.'),
    retriable: true,
    suggestedAction: 'retry_post_processing',
  };
}

function toGeneratedImageRecord(image: StoredImageArtifact, thumbnail: StoredImageArtifact | null, seed: number): GeneratedImageRecord {
  return {
    url: image.path,
    thumbnailUrl: thumbnail?.path || image.path,
    width: image.width,
    height: image.height,
    format: image.format,
    sizeBytes: image.sizeBytes,
    seed,
  };
}

function buildMetadataPayload(
  job: ImageQueueJobRecord,
  pipelineResult: Awaited<ReturnType<typeof executeIonImagePipelineRequest>>,
  artifacts: StoredImageArtifact[],
  postProcessing: IonImagePostProcessingSummary,
  promptAnalytics: IonImagePromptAnalytics,
): IonImageQueueMetadataPayload {
  return {
    requestId: job.requestId,
    jobId: job.jobId,
    promptId: pipelineResult.promptId,
    gateway: pipelineResult.gatewayKind,
    checkpoint: pipelineResult.request.model.checkpoint,
    styleFamily: pipelineResult.request.ionMetadata.styleFamily,
    reasoningChain: pipelineResult.request.ionMetadata.reasoningChain,
    postProcessing,
    promptAnalytics,
    artifacts: artifacts.map((artifact) => ({
      artifactId: artifact.artifactId,
      kind: artifact.kind,
      path: artifact.path,
      format: artifact.format,
    })),
  };
}

export async function runNextIonImageJob(
  queue: IImageJobQueue,
  storage: IImageArtifactStorage,
  source?: EnvironmentSource,
): Promise<ImageQueueJobRecord | null> {
  const jobStartedAt = Date.now();
  const job = await queue.dequeueNext();
  if (!job) {
    return null;
  }

  try {
    const pipelineResult = await executeIonImagePipelineRequest(job.request, source);
    const processing = await queue.markProcessing(job.jobId, pipelineResult.promptId);
    const postProcessingStartedAt = Date.now();
    const postProcessing = buildIonImagePostProcessingSummary(pipelineResult.request);
    const promptAnalytics = buildIonImagePromptAnalytics(pipelineResult.request);

    const imageArtifact = await storage.putImage({
      jobId: processing.jobId,
      kind: 'image',
      bytes: pipelineResult.imageBytes,
      mimeType: 'image/png',
      format: pipelineResult.request.postProcessing.format,
      width: pipelineResult.request.parameters.width,
      height: pipelineResult.request.parameters.height,
    });

    const thumbnailArtifact = pipelineResult.request.postProcessing.generateThumbnail
      ? await storage.putImage({
          jobId: processing.jobId,
          kind: 'thumbnail',
          bytes: pipelineResult.imageBytes,
          mimeType: 'image/png',
          format: pipelineResult.request.postProcessing.format,
          width: pipelineResult.request.parameters.width,
          height: pipelineResult.request.parameters.height,
        })
      : null;

    const artifacts = thumbnailArtifact ? [imageArtifact, thumbnailArtifact] : [imageArtifact];
    await storage.putMetadata(
      processing.jobId,
      buildMetadataPayload(processing, pipelineResult, artifacts, postProcessing, promptAnalytics),
    );

    const postProcessingMs = Date.now() - postProcessingStartedAt;
    const totalMs = Date.now() - jobStartedAt;

    const response: GenerationResponse = {
      requestId: processing.requestId,
      status: 'completed',
      images: [toGeneratedImageRecord(imageArtifact, thumbnailArtifact, pipelineResult.request.parameters.seed)],
      timing: {
        queueMs: 0,
        modelLoadMs: 0,
        inferenceMs: 0,
        postProcessingMs,
        totalMs,
      },
      modelInfo: {
        checkpoint: pipelineResult.request.model.checkpoint,
        predictionType: pipelineResult.request.model.predictionType,
        lorasApplied: pipelineResult.request.model.loras.map((lora) => lora.name),
        actualSteps: pipelineResult.request.parameters.steps,
        actualCfg: pipelineResult.request.parameters.cfgScale,
        vae: pipelineResult.request.model.vae,
      },
      error: null,
    };

    const completed = await queue.markCompleted(processing.jobId, response);
    emitIonImageGenerationLog(
      createIonImageGenerationLog({
        requestId: processing.requestId,
        jobId: processing.jobId,
        promptId: pipelineResult.promptId,
        status: 'completed',
        gateway: pipelineResult.gatewayKind,
        checkpoint: pipelineResult.request.model.checkpoint,
        styleFamily: pipelineResult.request.ionMetadata.styleFamily,
        artifactCount: artifacts.length,
        postProcessingMs,
        totalMs,
        promptAnalytics,
        error: null,
      }),
    );

    return completed;
  } catch (error) {
    const imageError = toImageError(error);
    const failed = await queue.markFailed(job.jobId, imageError);
    emitIonImageGenerationLog(
      createIonImageGenerationLog({
        requestId: job.requestId,
        jobId: job.jobId,
        promptId: failed.promptId,
        status: 'failed',
        gateway: null,
        checkpoint: job.request.model.checkpoint,
        styleFamily: job.request.ionMetadata.styleFamily,
        artifactCount: 0,
        postProcessingMs: 0,
        totalMs: Date.now() - jobStartedAt,
        promptAnalytics: buildIonImagePromptAnalytics(job.request),
        error: imageError,
      }),
    );

    return failed;
  }
}