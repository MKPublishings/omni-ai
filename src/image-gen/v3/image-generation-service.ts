import { executeIonImagePipeline, type IonImagePipelineInput } from '../app/ion-image-pipeline';
import { buildIonImageGenerationRequest } from '../app/ion-image-pipeline';
import { buildIonImageV2RouteResult } from '../app/ion-image-v2-route-service';
import { normalizeGeneratedImageOutput } from '../../shared/image-output';
import type { IonImagePipelineResult } from '../shared/types';
import type { IonImageV2RouteResponse } from '../shared/types';
import { readIonImageV3RuntimeConfig, type IonImageProviderKind } from './runtime-config';
import { renderIonNativeImage } from './ion-native-renderer';
import { mergePromptTokens } from '../orchestration/photogrammetry-blueprint';

type EnvironmentSource = Record<string, unknown>;

interface CloudflareAiRunner {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

interface IonImageV3GenerationInput extends IonImagePipelineInput {
  mode?: string;
  quality?: string;
  ratio?: string;
  feedbackApplied?: boolean;
}

export interface IonImageV3RouteResult {
  body: IonImageV2RouteResponse;
  headers: Record<string, string>;
}
const CLOUDFLARE_MAX_STEPS = 20;

function isIonDownError(error: unknown): boolean {
  const name = String((error as { name?: string } | null)?.name || '').trim().toUpperCase();
  return name === 'E_ION_DOWN';
}

function isTimeoutError(error: unknown): boolean {
  const name = String((error as { name?: string } | null)?.name || '').trim().toUpperCase();
  return name === 'E_TIMEOUT';
}

function shouldFallback(error: unknown, source: EnvironmentSource): boolean {
  const config = readIonImageV3RuntimeConfig(source);
  if (isIonDownError(error)) {
    return config.fallbackOnIonDown;
  }

  if (isTimeoutError(error)) {
    return config.fallbackOnTimeout;
  }

  return false;
}

function resolveProviderChain(source: EnvironmentSource): IonImageProviderKind[] {
  const config = readIonImageV3RuntimeConfig(source);
  const providers: IonImageProviderKind[] = [config.primaryProvider];
  if (config.fallbackProvider && config.fallbackProvider !== config.primaryProvider) {
    providers.push(config.fallbackProvider);
  }

  return providers;
}

function parsePositivePrompt(value: string): string {
  return String(value || '').trim();
}

function parseNegativePrompt(baseNegativePrompt: string, animeLike: boolean): string {
  const baseline = 'blurry, deformed anatomy, extra limbs, warped face, low contrast, artifacts, over-smoothed';
  const merged = mergePromptTokens(baseNegativePrompt, baseline);
  if (!animeLike) {
    return merged;
  }

  return mergePromptTokens(merged, 'photoreal artifacts, wax skin, monochrome haze');
}

function isAnimeLikePrompt(prompt: string): boolean {
  const normalized = parsePositivePrompt(prompt).toLowerCase();
  if (!normalized) {
    return false;
  }

  return /\b(anime|manga|waifu|niji|chibi|cel\s*shad|lineart|otaku|kawaii|ghibli)\b/i.test(normalized);
}

function resolveCloudflareGuidance(prompt: string, requestGuidance: number): number {
  const baseline = Number.isFinite(requestGuidance) && requestGuidance > 0
    ? requestGuidance
    : isAnimeLikePrompt(prompt)
      ? 8
      : 7;

  return Math.max(4, Math.min(12, baseline));
}

function resolveCloudflareSteps(prompt: string, requestSteps: number): number {
  const preferred = Number.isFinite(requestSteps) && requestSteps > 0
    ? requestSteps
    : isAnimeLikePrompt(prompt)
      ? 20
      : 18;

  return Math.min(CLOUDFLARE_MAX_STEPS, Math.max(1, preferred));
}

function resolveCloudflareModel(source: EnvironmentSource): string {
  const config = readIonImageV3RuntimeConfig(source);
  return config.fallbackModel;
}

function normalizeCloudflareDimensions(width: number, height: number): { width: number; height: number } {
  const maxEdge = 2048;
  const minEdge = 256;
  const block = 8;

  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1024;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1024;
  const largest = Math.max(safeWidth, safeHeight);
  const scale = largest > maxEdge ? maxEdge / largest : 1;

  const quantize = (value: number) => {
    const rounded = Math.round(value / block) * block;
    return Math.max(minEdge, Math.min(maxEdge, rounded));
  };

  return {
    width: quantize(safeWidth * scale),
    height: quantize(safeHeight * scale),
  };
}

async function runIonProvider(
  input: IonImageV3GenerationInput,
  source: EnvironmentSource,
): Promise<IonImagePipelineResult> {
  return executeIonImagePipeline(input, source);
}

async function runCloudflareAiProvider(
  input: IonImageV3GenerationInput,
  source: EnvironmentSource,
): Promise<IonImagePipelineResult> {
  const runner = source.AI as CloudflareAiRunner | undefined;
  if (!runner || typeof runner.run !== 'function') {
    const error = new Error('Cloudflare AI binding is unavailable for fallback image generation.');
    error.name = 'E_CLOUDFLARE_AI_UNAVAILABLE';
    throw error;
  }

  const request = await buildIonImageGenerationRequest(input, source);
  const model = resolveCloudflareModel(source);
  const positivePrompt = mergePromptTokens(
    request.prompt.qualityTags,
    request.prompt.styleTags,
    request.prompt.positive,
  );
  const animeLike = isAnimeLikePrompt(positivePrompt);
  const cloudflareDimensions = normalizeCloudflareDimensions(
    request.parameters.width,
    request.parameters.height,
  );

  request.parameters.width = cloudflareDimensions.width;
  request.parameters.height = cloudflareDimensions.height;

  const generated = await runner.run(model, {
    prompt: parsePositivePrompt(positivePrompt),
    negative_prompt: parseNegativePrompt(request.prompt.negative, animeLike),
    width: cloudflareDimensions.width,
    height: cloudflareDimensions.height,
    batch_size: 1,
    num_images: 1,
    seed: request.parameters.seed,
    num_steps: resolveCloudflareSteps(positivePrompt, request.parameters.steps),
    guidance: resolveCloudflareGuidance(positivePrompt, request.parameters.cfgScale),
  });

  const normalized = await normalizeGeneratedImageOutput(generated);

  return {
    request,
    workflow: {
      mode: 'cloudflare-ai-fallback',
      model,
      width: cloudflareDimensions.width,
      height: cloudflareDimensions.height,
    },
    promptId: `cfai-${request.requestId}`,
    imageBytes: normalized.bytes,
    outputModel: model,
    gatewayKind: 'mock',
  };
}

async function runIonNativeProvider(
  input: IonImageV3GenerationInput,
  source: EnvironmentSource,
): Promise<IonImagePipelineResult> {
  const request = await buildIonImageGenerationRequest(input, source);
  const rendered = renderIonNativeImage(request);
  const normalized = await normalizeGeneratedImageOutput(rendered.imageDataUrl);

  return {
    request,
    workflow: {
      mode: 'ion-native',
      renderer: 'vector-synth-v1',
      width: request.parameters.width,
      height: request.parameters.height,
    },
    promptId: `ion-native-${request.requestId}`,
    imageBytes: normalized.bytes,
    outputModel: 'ion-native-renderer/vector-synth-v1',
    gatewayKind: 'mock',
  };
}

async function runProvider(
  provider: IonImageProviderKind,
  input: IonImageV3GenerationInput,
  source: EnvironmentSource,
): Promise<IonImagePipelineResult> {
  if (provider === 'ion-native') {
    return runIonNativeProvider(input, source);
  }

  if (provider === 'cloudflare-ai') {
    return runCloudflareAiProvider(input, source);
  }

  return runIonProvider(input, source);
}

function mapStyleSource(input: IonImageV3GenerationInput): 'auto' | 'session-or-request' {
  return input.stylePack ? 'session-or-request' : 'auto';
}

function mapProviderHeader(provider: IonImageProviderKind | null): string {
  if (provider === 'ion-native' || provider === 'ion' || provider === 'cloudflare-ai') {
    return provider;
  }

  return 'ion-native';
}

export async function generateIonImageV3RouteResult(
  input: IonImageV3GenerationInput,
  source: EnvironmentSource,
): Promise<IonImageV3RouteResult> {
  const startedAt = Date.now();
  const providers = resolveProviderChain(source);
  let lastError: unknown = null;
  let activeProvider: IonImageProviderKind | null = null;

  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index]!;
    const isLastProvider = index === providers.length - 1;

    try {
      const pipelineResult = await runProvider(provider, input, source);
      activeProvider = provider;
      const fallbackUsed = index > 0;
      const primaryProvider = providers[0] || provider;
      const routeResult = await buildIonImageV2RouteResult({
        userId: input.userId,
        mode: String(input.mode || 'simple').trim() || 'simple',
        quality: input.quality,
        ratio: input.ratio,
        feedbackApplied: Boolean(input.feedbackApplied),
        styleSource: mapStyleSource(input),
        camera: {
          value: '',
          source: 'none',
        },
        lighting: {
          value: '',
          source: 'none',
        },
        materials: {
          values: [],
          source: 'none',
        },
        safety: {
          ageTier: 'adult',
          explicitAllowed: false,
          illegalBlocked: true,
        },
        pipelineResult,
        totalMs: Date.now() - startedAt,
      });

      return {
        body: routeResult.body,
        headers: {
          ...routeResult.headers,
          'X-ION-Image-Route': 'image-gen-v3',
          'X-ION-Image-Provider': mapProviderHeader(activeProvider),
          'X-ION-Fallback-Used': fallbackUsed ? '1' : '0',
          'X-ION-Primary-Provider': mapProviderHeader(primaryProvider),
          'Access-Control-Expose-Headers': 'X-ION-Image-Model, X-ION-Image-Provider, X-ION-Fallback-Used, X-ION-Primary-Provider',
        },
      };
    } catch (error) {
      lastError = error;
      if (isLastProvider || !shouldFallback(error, source)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('ION image v3 failed before provider execution could complete.');
}
