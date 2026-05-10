import type {
  IonImagePipelineResult,
  IonImageV2Metadata,
  IonImageV2RouteDebug,
  IonImageV2RouteRequestedDebug,
  IonImageV2RouteResponse,
} from '../shared/types';
import {
  buildIonImagePostProcessingSummary,
  buildIonImagePromptAnalytics,
} from '../post-processing/ion-image-post-processor';

export interface BuildIonImageV2RouteResponseInput {
  userId: string;
  imageDataUrl: string;
  filename: string;
  mimeType: string;
  mode: string;
  quality: string;
  ratio: string;
  feedbackApplied: boolean;
  styleSource: IonImageV2Metadata['request']['styleSource'];
  camera: IonImageV2Metadata['scene']['camera'];
  lighting: IonImageV2Metadata['scene']['lighting'];
  materials: IonImageV2Metadata['scene']['materials'];
  safety: IonImageV2Metadata['safety'];
  pipelineResult: IonImagePipelineResult;
  debugRequested?: IonImageV2RouteRequestedDebug;
}

export function buildIonImageV2RouteResponse(
  input: BuildIonImageV2RouteResponseInput,
): IonImageV2RouteResponse {
  const metadata: IonImageV2Metadata = {
    pipeline: {
      version: 'v2',
      gateway: input.pipelineResult.gatewayKind,
      requestId: input.pipelineResult.request.requestId,
      promptId: input.pipelineResult.promptId,
      reasoningChain: input.pipelineResult.request.ionMetadata.reasoningChain,
      execution: input.pipelineResult.request.ionMetadata.executionPlan
        ? {
            ticketId: input.pipelineResult.request.ionMetadata.executionPlan.ticketId,
            planner: input.pipelineResult.request.ionMetadata.executionPlan.planner,
            estimatedParallelism: input.pipelineResult.request.ionMetadata.executionPlan.estimatedParallelism,
            simulationSupportEnabled: input.pipelineResult.request.ionMetadata.executionPlan.simulationSupportEnabled,
            entityCount: input.pipelineResult.request.ionMetadata.executionPlan.entities.length,
            capabilities: input.pipelineResult.request.ionMetadata.executionPlan.capabilities,
          }
        : undefined,
    },
    request: {
      mode: input.mode,
      quality: input.quality,
      originalPrompt: input.pipelineResult.request.ionMetadata.originalUserPrompt,
      styleFamily: input.pipelineResult.request.ionMetadata.styleFamily,
      styleSource: input.styleSource,
      inferredMood: input.pipelineResult.request.ionMetadata.inferredMood,
      confidence: input.pipelineResult.request.ionMetadata.confidence,
      feedbackApplied: input.feedbackApplied,
    },
    image: {
      filename: input.filename,
      mimeType: input.mimeType,
      width: input.pipelineResult.request.parameters.width,
      height: input.pipelineResult.request.parameters.height,
      ratio: input.ratio,
      resolution: `${input.pipelineResult.request.parameters.width}x${input.pipelineResult.request.parameters.height}`,
      format: input.pipelineResult.request.postProcessing.format,
      exportLocation: 'chat-download',
    },
    model: {
      checkpoint: input.pipelineResult.request.model.checkpoint,
      outputModel: input.pipelineResult.outputModel,
      predictionType: input.pipelineResult.request.model.predictionType,
      vae: input.pipelineResult.request.model.vae,
      clipSkip: input.pipelineResult.request.model.clipSkip,
      sampler: input.pipelineResult.request.parameters.sampler,
      scheduler: input.pipelineResult.request.parameters.scheduler,
      steps: input.pipelineResult.request.parameters.steps,
      cfgScale: input.pipelineResult.request.parameters.cfgScale,
      cfgRescale: input.pipelineResult.request.parameters.cfgRescale,
      seed: input.pipelineResult.request.parameters.seed,
      batchSize: input.pipelineResult.request.parameters.batchSize,
    },
    prompt: {
      positive: input.pipelineResult.request.prompt.positive,
      negative: input.pipelineResult.request.prompt.negative,
      qualityTags: input.pipelineResult.request.prompt.qualityTags,
      styleTags: input.pipelineResult.request.prompt.styleTags,
    },
    postProcessing: buildIonImagePostProcessingSummary(input.pipelineResult.request),
    promptAnalytics: buildIonImagePromptAnalytics(input.pipelineResult.request),
    scene: {
      camera: input.camera,
      lighting: input.lighting,
      materials: input.materials,
    },
    safety: input.safety,
  };

  const responsePayload: IonImageV2RouteResponse = {
    user_id: input.userId,
    imageDataUrl: input.imageDataUrl,
    filename: input.filename,
    metadata,
  };

  if (input.debugRequested) {
    const debug: IonImageV2RouteDebug = {
      requested: input.debugRequested,
      v2_pipeline: {
        checkpoint: metadata.model.checkpoint,
        promptId: metadata.pipeline.promptId,
        workflowMetadata: input.pipelineResult.workflow.metadata,
        reasoningChain: metadata.pipeline.reasoningChain,
        gateway: metadata.pipeline.gateway,
        requestId: metadata.pipeline.requestId,
      },
    };

    responsePayload.debug = debug;
  }

  return responsePayload;
}