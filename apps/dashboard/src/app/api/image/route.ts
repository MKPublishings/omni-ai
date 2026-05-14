import { buildionWorkflow } from 'image-gen/app/ion-image-pipeline';
import { ionImageV2RouteService } from 'image-gen/app/ion-image-v2-route-service';
import { imageGenerationService } from 'image-gen/v3/image-generation-service';
import { ImageGenTypes } from 'image-gen/shared/types';
import { NextRequest, NextResponse } from 'next/server';
import { generateIonImageV3RouteResult } from 'lib/ion-image-v3';

const IMAGE_SAMPLERS: ImageGenTypes.ImageSampler[] = ['ddim', 'euler', 'euler-ancestral', 'heun', 'lms', 'dpm2', 'dpm2-ancestral', 'dpMPP2MSampler', 'dpMPP2MSampler2', 'ddpm'];
const IMAGE_SCHEDULERS: ImageGenTypes.ImageScheduler[] = ['normal', 'karras'];
export const runtime = 'nodejs'

const MOCK_IMAGE_DATA_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIHZpZXdCb3g9IjAgMCAxMDI0IDEwMjQiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIHN0b3AtY29sb3I9IiMwYjE2MjAiLz48c3RvcCBvZmZzZXQ9IjAuNSIgc3RvcC1jb2xvcj0iIzEzM2I1ZSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzA4YmY5YiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIGZpbGw9InVybCgjZykiLz48Y2lyY2xlIGN4PSIyMDQiIGN5PSIyMjAiIHI9IjEyMCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjxjaXJjbGUgY3g9Ijc5MCIgY3k9IjMwMCIgcj0iMTgwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDYpIi8+PHBhdGggZD0iTTIwMCA3MjBjMTEwLTE2MCAyMjAtMjQwIDMzMC0yNDBzMjIwIDgwIDMzMCAyNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjE4KSIgc3Ryb2tlLXdpZHRoPSIzMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHRleHQgeD0iMTEwIiB5PSI4MjAiIGZpbGw9IiNlNmYyZmYiIGZvbnQtZmFtaWx5PSJHZW9yZ2lhLCBUaW1lcyBOZXcgUm9tYW4sIHNlcmlmIiBmb250LXNpemU9IjY0IjBmb250LXdlaWdodD0iNjAwIj5JT04gSW1hZ2U8L3RleHQ+PHRleHQgeD0iMTEwIiB5PSI4ODAiIGZpbGw9InJnYmEoMjMwLDI0MiwyNTUsMC43MikiIGZvbnQtZmFtaWx5PSJHZWFnaWEsIFRpbWVzIE5ldyBSb21hbiwgc2VyaWYiIGZvbnQtc2l6ZT0iMzAiPkRhc2hib2FyZCBsb2NhbCBpbWFnZSBmYWxsYmFjayBpcyBvbmxpbmUuPC90ZXh0Pjwvc3ZnPg=='

function getConfiguredApiBaseUrl(): string | null {
  const configuredBase = String(process.env.NEXT_PUBLIC_ION_API_URL || '').trim()
  return configuredBase ? configuredBase.replace(/\/+$/, '') : null
}

function isDirectRelayEnabled(): boolean {
  return ['1', 'true', 'yes', 'on'].includes(String(process.env.DASHBOARD_IMAGE_DIRECT_RELAY || '').trim().toLowerCase())
}

function isV3RelayEnabled(): boolean {
  return true
}

function normalizeAgeTier(value: unknown): 'adult' | 'minor' {
  return String(value || '').trim().toLowerCase() === 'minor' ? 'minor' : 'adult'
}

function parseSampler(value: unknown): ImageGenTypes.ImageSampler | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return undefined
  }

  return (IMAGE_SAMPLERS as readonly string[]).includes(normalized)
    ? (normalized as ImageGenTypes.ImageSampler)
    : undefined
}

function parseScheduler(value: unknown): ImageGenTypes.ImageScheduler | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return undefined
  }

  return (IMAGE_SCHEDULERS as readonly string[]).includes(normalized)
    ? (normalized as ImageGenTypes.ImageScheduler)
    : undefined
}

function mapV2Failure(error: unknown): { status: number; code: string; message: string } {
  const message = String((error as { message?: string } | null)?.message || 'Image generation failed')
  const name = String((error as { name?: string } | null)?.name || '').trim()

  if (name === 'E_SAFETY_BLOCK') {
    return {
      status: 403,
      code: 'safety-blocked',
      message: 'Image generation adjusted for safety context.',
    }
  }

  if (name === 'E_ion_DOWN') {
    return {
      status: 503,
      code: 'provider-unavailable',
      message,
    }
  }

  if (name === 'E_TIMEOUT') {
    return {
      status: 504,
      code: 'provider-timeout',
      message,
    }
  }

  return {
    status: 500,
    code: 'image-generation-failed',
    message,
  }
}

async function buildDirectRelayResponse(body: Record<string, unknown>) {
  const prompt = String(body.prompt || '').trim()
  if (!prompt) {
    return NextResponse.json({ success: false, error: "Field 'prompt' is required" }, {
      status: 400,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }

  try {
    const startedAt = Date.now()
    const userId = String(body.userId || 'dashboard-relay').trim() || 'dashboard-relay'

    if (isV3RelayEnabled()) {
      const responsePayload = await generateIonImageV3RouteResult({
        userId,
        prompt,
        stylePack: typeof body.stylePack === 'string' ? body.stylePack : undefined,
        width: Number.isFinite(Number(body.width)) ? Number(body.width) : undefined,
        height: Number.isFinite(Number(body.height)) ? Number(body.height) : undefined,
        seed: Number.isFinite(Number(body.seed)) ? Number(body.seed) : undefined,
        steps: Number.isFinite(Number(body.steps)) ? Number(body.steps) : undefined,
        cfgScale: Number.isFinite(Number(body.cfgScale)) ? Number(body.cfgScale) : undefined,
        cfgRescale: Number.isFinite(Number(body.cfgRescale)) ? Number(body.cfgRescale) : undefined,
        denoise: Number.isFinite(Number(body.denoise)) ? Number(body.denoise) : undefined,
        sampler: parseSampler(body.sampler),
        scheduler: parseScheduler(body.scheduler),
        batchSize: Number.isFinite(Number(body.batchSize)) ? Number(body.batchSize) : undefined,
        mode: String(body.mode || 'simple').trim() || 'simple',
        quality: typeof body.quality === 'string' ? body.quality : undefined,
        ratio: typeof body.ratio === 'string' ? body.ratio : undefined,
        feedbackApplied: Boolean(String(body.feedback || '').trim()),
      }, {
        ...(process.env as Record<string, unknown>),
        ION_IMAGE_PROVIDER_PRIMARY: 'cloudflare-ai',
        ION_IMAGE_PROVIDER_FALLBACK: 'ion-native',
      })

      return NextResponse.json(responsePayload.body, {
        status: 200,
        headers: {
          ...responsePayload.headers,
          'Cache-Control': 'no-store',
        },
      })
    }

    const pipelineResult = await generateIonImageV3RouteResult(
      {
        userId,
        prompt,
        stylePack: typeof body.stylePack === 'string' ? body.stylePack : undefined,
        width: Number.isFinite(Number(body.width)) ? Number(body.width) : undefined,
        height: Number.isFinite(Number(body.height)) ? Number(body.height) : undefined,
        seed: Number.isFinite(Number(body.seed)) ? Number(body.seed) : undefined,
        steps: Number.isFinite(Number(body.steps)) ? Number(body.steps) : undefined,
        cfgScale: Number.isFinite(Number(body.cfgScale)) ? Number(body.cfgScale) : undefined,
        cfgRescale: Number.isFinite(Number(body.cfgRescale)) ? Number(body.cfgRescale) : undefined,
        denoise: Number.isFinite(Number(body.denoise)) ? Number(body.denoise) : undefined,
        sampler: parseSampler(body.sampler),
        scheduler: parseScheduler(body.scheduler),
        batchSize: Number.isFinite(Number(body.batchSize)) ? Number(body.batchSize) : undefined,
      },
      process.env as Record<string, unknown>,
    )

    const responsePayload = await generateIonImageV3RouteResult({
      userId,
      mode: String(body.mode || 'simple').trim() || 'simple',
      quality: typeof body.quality === 'string' ? body.quality : undefined,
      ratio: typeof body.ratio === 'string' ? body.ratio : undefined,
      feedbackApplied: Boolean(String(body.feedback || '').trim()),
      styleSource: body.stylePack ? 'session-or-request' : 'auto',
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
        ageTier: normalizeAgeTier((body.safetyProfile as { ageTier?: string } | undefined)?.ageTier),
        explicitAllowed: Boolean((body.safetyProfile as { explicitAllowed?: boolean } | undefined)?.explicitAllowed),
        illegalBlocked: (body.safetyProfile as { illegalBlocked?: boolean } | undefined)?.illegalBlocked !== false,
      },
      pipelineResult,
      totalMs: Date.now() - startedAt,
    })

    return NextResponse.json(responsePayload.body, {
      status: 200,
      headers: {
        ...responsePayload.headers,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const failure = mapV2Failure(error)
    return NextResponse.json({
      success: false,
      code: failure.code,
      error: failure.message,
    }, {
      status: failure.status,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
}

function buildMockImageResponse(prompt: string) {
  const normalizedPrompt = String(prompt || '').trim() || 'Untitled image prompt'

  return {
    user_id: 'local-dashboard',
    imageDataUrl: MOCK_IMAGE_DATA_URL,
    filename: 'ion-dashboard-local-fallback.svg',
    metadata: {
      pipeline: {
        version: 'v2',
        gateway: 'mock',
        requestId: `local-${Date.now()}`,
        promptId: `local-prompt-${Date.now()}`,
        reasoningChain: ['dashboard-local-fallback'],
      },
      request: {
        mode: 'simple',
        quality: 'ultra',
        originalPrompt: normalizedPrompt,
        styleFamily: 'cinematic_niji',
        styleSource: 'default',
        inferredMood: 'exploratory',
        confidence: 0.72,
        feedbackApplied: false,
      },
      image: {
        filename: 'ion-dashboard-local-fallback.svg',
        mimeType: 'image/svg+xml',
        width: 1024,
        height: 1024,
        ratio: '1:1',
        resolution: '1024x1024',
        format: 'png',
        exportLocation: 'chat-download',
      },
      model: {
        checkpoint: 'ion-citizen-xl-vpred-v2.0',
        outputModel: 'ion-citizen-xl-vpred-v2.0',
        predictionType: 'v_prediction',
        vae: 'sdxl-vae-fp16-fix',
        clipSkip: 2,
        sampler: 'euler',
        scheduler: 'normal',
        steps: 28,
        cfgScale: 5,
        cfgRescale: 0.2,
        seed: 42,
        batchSize: 1,
      },
    },
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const configuredBase = getConfiguredApiBaseUrl()

  if (isDirectRelayEnabled()) {
    return buildDirectRelayResponse(body)
  }

  if (!configuredBase) {
    return NextResponse.json(buildMockImageResponse(String(body.prompt || '')), {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }

  try {
    const response = await fetch(`${configuredBase}/api/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') ? { Authorization: String(request.headers.get('authorization')) } : {}),
      },
      cache: 'no-store',
      body: JSON.stringify(body),
    })

    const payload = await response.json().catch(() => ({ error: 'Image proxy returned an invalid response.' }))
    return NextResponse.json(payload, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return NextResponse.json({
      error: `Image proxy failed: ${String((error as Error)?.message || 'unknown error')}`,
    }, {
      status: 502,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
}