import { executeIonImagePipelineRequest } from '../app/ion-image-pipeline';
import type { GenerationRequest } from '../shared/types';

type EnvironmentSource = Record<string, unknown>;

export interface ImageGenRequest {
  requestId: string;
  entityId: string;
  prompt: string;
  styleHints?: string[];
  simStateRef: string;
  generationRequest: GenerationRequest;
}

export interface ImageGenOutput {
  requestId: string;
  entityId: string;
  imageRef: string;
  latentMetadata: Record<string, unknown>;
  narrativeTags?: string[];
  physicsTags?: string[];
  imageBytes: Uint8Array;
  promptId: string;
  outputModel: string;
  gatewayKind: 'mock' | 'ion';
}

export interface ImageGeneratorAdapterDeps {
  execute?: typeof executeIonImagePipelineRequest;
}

function toNarrativeTags(job: ImageGenRequest): string[] {
  const styleHints = Array.isArray(job.styleHints) ? job.styleHints : [];
  const metadata = job.generationRequest.ionMetadata;

  return [
    metadata.styleFamily,
    metadata.inferredMood,
    ...styleHints,
  ].filter((value): value is string => Boolean(value && String(value).trim()));
}

function toPhysicsTags(job: ImageGenRequest): string[] {
  const params = job.generationRequest.parameters;
  const model = job.generationRequest.model;

  return [
    `${params.width}x${params.height}`,
    `sampler:${params.sampler}`,
    `scheduler:${params.scheduler}`,
    `steps:${params.steps}`,
    `cfg:${params.cfgScale}`,
    `prediction:${model.predictionType}`,
  ];
}

function buildImageRef(requestId: string, promptId: string): string {
  return `ion://image/${requestId}/${promptId}`;
}

export async function callImageGenerator(
  job: ImageGenRequest,
  source?: EnvironmentSource,
  deps?: ImageGeneratorAdapterDeps,
): Promise<ImageGenOutput> {
  const execute = deps?.execute ?? executeIonImagePipelineRequest;
  const result = await execute(job.generationRequest, source);

  return {
    requestId: job.requestId,
    entityId: job.entityId,
    imageRef: buildImageRef(job.requestId, result.promptId),
    latentMetadata: {
      promptId: result.promptId,
      checkpoint: result.request.model.checkpoint,
      predictionType: result.request.model.predictionType,
      sampler: result.request.parameters.sampler,
      scheduler: result.request.parameters.scheduler,
      seed: result.request.parameters.seed,
      steps: result.request.parameters.steps,
      cfgScale: result.request.parameters.cfgScale,
      cfgRescale: result.request.parameters.cfgRescale,
      gatewayKind: result.gatewayKind,
      outputModel: result.outputModel,
    },
    narrativeTags: toNarrativeTags(job),
    physicsTags: toPhysicsTags(job),
    imageBytes: result.imageBytes,
    promptId: result.promptId,
    outputModel: result.outputModel,
    gatewayKind: result.gatewayKind,
  };
}
