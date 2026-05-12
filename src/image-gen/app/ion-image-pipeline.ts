import { buildionWorkflow } from '../backend/gateway/workflow-builder';
import { ionClient } from '../backend/gateway/ionClient';
import { MockionClient } from '../backend/gateway/MockionClient';
import { getImageGenerationError } from '../shared/error-codes';
import { getCheckpointConfig } from '../config/models.config';
import type {
  ionWorkflow,
  GenerationRequest,
  ImageCompositionPreset,
  ImageVariationMode,
  ImageSampler,
  ImageScheduler,
  IModelGateway,
  ImageJobStatus,
  IonImagePipelineResult,
  KimonoStyleProfileId,
  StyleFamilyId,
} from '../shared/types';
import { IonImageOrchestrator } from '../orchestration/ion-image-orchestrator';

type EnvironmentSource = Record<string, unknown>;

export interface IonImagePipelineInput {
  userId: string;
  prompt: string;
  mode?: string;
  checkpoint?: string;
  stylePack?: string;
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
  cfgScale?: number;
  cfgRescale?: number;
  denoise?: number;
  sampler?: ImageSampler;
  scheduler?: ImageScheduler;
  batchSize?: number;
  variationMode?: ImageVariationMode;
  anatomyStrictMode?: boolean;
  styleProfile?: KimonoStyleProfileId;
  compositionPreset?: ImageCompositionPreset;
}

const HARD_RESET_LANDSCAPE_MODES = new Set([
  'hard-reset-desert',
  'hard-reset-landscape',
  'landscape-debug',
]);

const HARD_RESET_POSITIVE_PROMPT = 'wide-angle photo of an empty mountain valley, no people, no characters, only environment, natural depth layering, realistic landscape photography';
const HARD_RESET_NEGATIVE_PROMPT = 'people, person, human, face, portrait, character, anime, illustration, selfie, close-up, upper body, bust, fashion, figure, humanoid, building, house, city, architecture, text, logo, watermark';
const HARD_RESET_CHECKPOINT = 'ion-citizen-xl-vpred-v2.0';
const FORCED_CHECKPOINT = 'ion-citizen-xl-vpred-v2.0';

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}

function isHardResetLandscapeMode(mode: string | undefined): boolean {
  return HARD_RESET_LANDSCAPE_MODES.has(String(mode || '').trim().toLowerCase());
}

function buildHardResetLandscapeRequest(input: IonImagePipelineInput): GenerationRequest {
  const requestId = crypto.randomUUID();
  const checkpoint = getCheckpointConfig(HARD_RESET_CHECKPOINT);
  const width = Number.isFinite(input.width) && Number(input.width) > Number(input.height || 0)
    ? Number(input.width)
    : 1024;
  const height = Number.isFinite(input.height) && Number(input.height) > 0 && Number(input.height) < width
    ? Number(input.height)
    : 576;
  const seed = Number.isFinite(input.seed)
    ? Math.max(1, Math.floor(Number(input.seed)))
    : Math.floor(Math.random() * 2_147_483_647) || 1;

  return {
    requestId,
    userId: input.userId,
    sessionId: `img-${crypto.randomUUID()}`,
    priority: 'interactive',
    timestamp: new Date().toISOString(),
    prompt: {
      positive: HARD_RESET_POSITIVE_PROMPT,
      negative: HARD_RESET_NEGATIVE_PROMPT,
      qualityTags: ['high detail', 'natural colors', 'photorealistic'],
      styleTags: ['landscape photography'],
    },
    model: {
      checkpoint: checkpoint.id,
      predictionType: checkpoint.predictionType,
      vae: checkpoint.vae,
      loras: [],
      clipSkip: checkpoint.clipSkip,
    },
    parameters: {
      width,
      height,
      steps: Math.round(clampNumber(input.steps, 24, 20, 30)),
      cfgScale: clampNumber(input.cfgScale, 6, 5, 7),
      cfgRescale: Number(checkpoint.recommendedCfgRescale || 0),
      denoise: 1,
      sampler: 'dpmpp_2m_karras',
      scheduler: 'karras',
      seed,
      batchSize: 1,
    },
    postProcessing: {
      upscale: {
        enabled: false,
        model: '4x-UltraSharp',
        scale: 2,
      },
      format: 'png',
      quality: 95,
      embedMetadata: true,
      generateThumbnail: true,
    },
    ionMetadata: {
      reasoningChain: ['intent_parse', 'profile_check', 'param_optimize', 'workflow_build', 'submit'],
      originalUserPrompt: input.prompt,
      styleFamily: 'semi_realistic_2_5d',
      inferredMood: 'neutral',
      confidence: 1,
      subjectDomain: 'environment',
      primarySubject: 'desert landscape',
      subjectPriorityAnchors: ['desert landscape', 'sand dunes', 'clear sky', 'no people', 'no buildings'],
      latentIsolationNonce: requestId,
      compositionPreset: 'cinematic',
      anatomyStrictMode: true,
      kimonoMode: false,
    },
  };
}

export async function buildIonImageGenerationRequest(
  input: IonImagePipelineInput,
  source?: EnvironmentSource,
): Promise<GenerationRequest> {
  const envSource = getEnvironmentSource(source);

  if (isHardResetLandscapeMode(input.mode)) {
    return buildHardResetLandscapeRequest(input);
  }

  const orchestrator = new IonImageOrchestrator(envSource);

  return orchestrator.processRequest({
    userId: input.userId,
    sessionId: `img-${crypto.randomUUID()}`,
    prompt: input.prompt,
    styleFamily: resolveStyleFamily(input.stylePack),
    checkpoint: FORCED_CHECKPOINT,
    variationMode: input.variationMode,
    anatomyStrictMode: input.anatomyStrictMode,
    styleProfile: input.styleProfile,
    compositionPreset: input.compositionPreset,
    parameterOverrides: {
      width: input.width,
      height: input.height,
      seed: input.seed,
      steps: input.steps,
      cfgScale: input.cfgScale,
      cfgRescale: input.cfgRescale,
      denoise: input.denoise,
      sampler: input.sampler,
      scheduler: input.scheduler,
      batchSize: input.batchSize,
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

function createGateway(source: EnvironmentSource): { gateway: IModelGateway; gatewayKind: 'mock' | 'ion' } {
  const env = readImageGenEnvironment(source);
  if (env.ionMock) {
    return {
      gateway: new MockionClient(),
      gatewayKind: 'mock',
    };
  }

  return {
    gateway: new ionClient(source),
    gatewayKind: 'ion',
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
  if (gateway instanceof ionClient) {
    return gateway.getLastHealthFailure();
  }

  return null;
}

function throwImageError(code: 'E_ion_DOWN' | 'E_TIMEOUT', details?: string | null): never {
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
    throwImageError('E_ion_DOWN', getGatewayHealthFailure(gateway));
  }

  const workflow = buildionWorkflow(request);
  const { promptId } = await gateway.submitWorkflow(workflow);

  let lastStatus: ImageJobStatus = 'queued';
  let progressStreamError: unknown = null;

  if (gateway instanceof ionClient && typeof WebSocket === 'function') {
    try {
      for await (const progress of gateway.getProgressWebSocket(promptId)) {
        lastStatus = progress.status;
        if (isTerminalStatus(progress.status)) {
          break;
        }
      }
    } catch (error) {
      progressStreamError = error;
    }
  }

  if (!isTerminalStatus(lastStatus)) {
    for await (const progress of gateway.getProgress(promptId)) {
      lastStatus = progress.status;
      if (isTerminalStatus(progress.status)) {
        break;
      }
    }
  }

  if (lastStatus !== 'completed' && progressStreamError instanceof Error) {
    // Surface WebSocket context if polling fallback did not complete either.
    const fallbackErr = new Error(progressStreamError.message);
    fallbackErr.name = progressStreamError.name;
    throw fallbackErr;
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