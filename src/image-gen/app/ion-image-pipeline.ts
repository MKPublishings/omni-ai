import { buildComfyUIWorkflow } from '../backend/gateway/workflow-builder';
import { ComfyUIClient } from '../backend/gateway/ComfyUIClient';
import { MockComfyUIClient } from '../backend/gateway/MockComfyUIClient';
import { readImageGenEnvironment } from '../config/env';
import { getImageGenerationError } from '../shared/error-codes';
import type {
  ComfyUIWorkflow,
  GenerationRequest,
  IModelGateway,
  ImageJobStatus,
  IonImagePipelineResult,
  StyleFamilyId,
} from '../shared/types';
import { IonImageOrchestrator } from '../orchestration/ion-image-orchestrator';

type EnvironmentSource = Record<string, unknown>;

export interface IonImagePipelineInput {
  userId: string;
  prompt: string;
  stylePack?: string;
  width?: number;
  height?: number;
  seed?: number;
}

export async function buildIonImageGenerationRequest(
  input: IonImagePipelineInput,
  source?: EnvironmentSource,
): Promise<GenerationRequest> {
  const envSource = getEnvironmentSource(source);
  const env = readImageGenEnvironment(envSource);
  const orchestrator = new IonImageOrchestrator();

  return orchestrator.processRequest({
    userId: input.userId,
    sessionId: `img-${crypto.randomUUID()}`,
    prompt: input.prompt,
    styleFamily: resolveStyleFamily(input.stylePack),
    checkpoint: env.defaultCheckpoint,
    parameterOverrides: {
      width: input.width,
      height: input.height,
      seed: input.seed,
    },
  });
}

const STYLE_PACK_TO_FAMILY: Array<{ pattern: RegExp; styleFamily: StyleFamilyId }> = [
  { pattern: /cinematic|niji|anime|vfx|mythic/i, styleFamily: 'cinematic_niji' },
  { pattern: /pastel|shoujo|ethereal|dreamy/i, styleFamily: 'soft_pastel_shoujo' },
  { pattern: /gritty|seinen|noir|dark/i, styleFamily: 'gritty_seinen' },
  { pattern: /retro|90s|vhs|cel/i, styleFamily: 'retro_90s_cel' },
  { pattern: /semi|real|hyper-real|realistic|2\.5d/i, styleFamily: 'semi_realistic_2_5d' },
  { pattern: /watercolor|painterly|paint/i, styleFamily: 'painterly_watercolor' },
  { pattern: /lofi|lo-fi|cozy|study/i, styleFamily: 'lofi_aesthetic' },
];

function resolveStyleFamily(stylePack: string | undefined): StyleFamilyId | undefined {
  const normalized = String(stylePack || '').trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  for (const entry of STYLE_PACK_TO_FAMILY) {
    if (entry.pattern.test(normalized)) {
      return entry.styleFamily;
    }
  }

  return undefined;
}

function createGateway(source: EnvironmentSource): { gateway: IModelGateway; gatewayKind: 'mock' | 'comfyui' } {
  const env = readImageGenEnvironment(source);
  if (env.comfyuiMock) {
    return {
      gateway: new MockComfyUIClient(),
      gatewayKind: 'mock',
    };
  }

  return {
    gateway: new ComfyUIClient(),
    gatewayKind: 'comfyui',
  };
}

function getEnvironmentSource(source?: EnvironmentSource): EnvironmentSource {
  if (source) {
    return source;
  }

  if (typeof process !== 'undefined' && process.env) {
    return process.env as EnvironmentSource;
  }

  return {};
}

function isTerminalStatus(status: ImageJobStatus): boolean {
  return status === 'completed' || status === 'failed';
}

function getGatewayHealthFailure(gateway: IModelGateway): string | null {
  if (gateway instanceof ComfyUIClient) {
    return gateway.getLastHealthFailure();
  }

  return null;
}

function throwImageError(code: 'E_COMFYUI_DOWN' | 'E_TIMEOUT', details?: string | null): never {
  const imageError = getImageGenerationError(code);
  const error = new Error(details ? `${imageError.message} ${details}` : imageError.message);
  error.name = imageError.code;
  throw error;
}

export async function executeIonImagePipelineRequest(
  request: GenerationRequest,
  source?: EnvironmentSource,
): Promise<IonImagePipelineResult> {
  const envSource = getEnvironmentSource(source);
  const { gateway, gatewayKind } = createGateway(envSource);

  const healthy = await gateway.isHealthy();
  if (!healthy) {
    throwImageError('E_COMFYUI_DOWN', getGatewayHealthFailure(gateway));
  }

  const workflow = buildComfyUIWorkflow(request);
  const { promptId } = await gateway.submitWorkflow(workflow);

  let lastStatus: ImageJobStatus = 'queued';
  for await (const progress of gateway.getProgress(promptId)) {
    lastStatus = progress.status;
    if (isTerminalStatus(progress.status)) {
      break;
    }
  }

  if (lastStatus !== 'completed') {
    throwImageError('E_TIMEOUT');
  }

  const imageBytes = await gateway.getOutputImage(promptId);
  const outputModel = (await gateway.getLoadedModel()) || request.model.checkpoint;

  return {
    request,
    workflow,
    promptId,
    imageBytes,
    outputModel,
    gatewayKind,
  };
}

export async function executeIonImagePipeline(
  input: IonImagePipelineInput,
  source?: EnvironmentSource,
): Promise<IonImagePipelineResult> {
  const envSource = getEnvironmentSource(source);
  const request = await buildIonImageGenerationRequest(input, envSource);
  return executeIonImagePipelineRequest(request, envSource);
}