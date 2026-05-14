import { NextRequest, NextResponse } from 'next/server'

import { buildionWorkflow } from 'image-gen/app/ion-image-pipeline'
import { ionImageV2RouteService } from 'image-gen/app/ion-image-v2-route-service'
import { imageGenerationService } from 'image-gen/v3/image-generation-service'
import { ionImageV3 } from 'image-gen/v3/ion-image-v3'
import { ImageGenTypes } from 'image-gen/shared/types'

import { generateIonImageV3RouteResult } from '@/lib/generate-ion-image-v3-route-result'

export const runtime = 'nodejs'

const IMAGE_SAMPLERS: ImageGenTypes.ImageSampler[] = [
  'ddim', 'euler', 'euler-ancestral', 'heun', 'lms',
  'dpm2', 'dpm2-ancestral', 'dpMPP2MSampler', 'dpMPP2MSampler2', 'ddpm'
]

const IMAGE_SCHEDULERS: ImageGenTypes.ImageScheduler[] = ['normal', 'karras']

function parseSampler(value: unknown): ImageGenTypes.ImageSampler | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase()
  return IMAGE_SAMPLERS.includes(normalized as any)
    ? (normalized as ImageGenTypes.ImageSampler)
    : undefined
}

function parseScheduler(value: unknown): ImageGenTypes.ImageScheduler | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase()
  return IMAGE_SCHEDULERS.includes(normalized as any)
    ? (normalized as ImageGenTypes.ImageScheduler)
    : undefined
}

function normalizeAgeTier(value: unknown): 'adult' | 'minor' {
  return String(value || '').trim().toLowerCase() === 'minor' ? 'minor' : 'adult'
}

function isDirectRelayEnabled(): boolean {
  return ['1', 'true', 'yes', 'on'].includes(
    String(process.env.DASHBOARD_IMAGE_DIRECT_RELAY || '').trim().toLowerCase()
  )
}

function getConfiguredApiBaseUrl(): string | null {
  const configured = String(process.env.NEXT_PUBLIC_ION_API_URL || '').trim()
  return configured ? configured.replace(/\/+$/, '') : null
}

async function buildDirectRelayResponse(body: Record<string, unknown>) {
  const prompt = String(body.prompt || '').trim()
  if (!prompt) {
    return NextResponse.json(
      { success: false, error: "Field 'prompt' is required" },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const userId = String(body.userId || 'dashboard-relay').trim() || 'dashboard-relay'

  const responsePayload = await generateIonImageV3RouteResult(
    {
      userId,
      prompt,
      stylePack: typeof body.stylePack === 'string' ? body.stylePack : undefined,
      width: Number(body.width) || undefined,
      height: Number(body.height) || undefined,
      seed: Number(body.seed) || undefined,
      steps: Number(body.steps) || undefined,
      cfgScale: Number(body.cfgScale) || undefined,
      cfgRescale: Number(body.cfgRescale) || undefined,
      denoise: Number(body.denoise) || undefined,
      sampler: parseSampler(body.sampler),
      scheduler: parseScheduler(body.scheduler),
      batchSize: Number(body.batchSize) || undefined,
      mode: String(body.mode || 'simple').trim(),
      quality: typeof body.quality === 'string' ? body.quality : undefined,
      ratio: typeof body.ratio === 'string' ? body.ratio : undefined,
      feedbackApplied: Boolean(String(body.feedback || '').trim())
    },
    {
      ...(process.env as Record<string, unknown>),
      ION_IMAGE_PROVIDER_PRIMARY: 'cloudflare-ai',
      ION_IMAGE_PROVIDER_FALLBACK: 'ion-native'
    }
  )

  return NextResponse.json(responsePayload.body, {
    status: 200,
    headers: {
      ...responsePayload.headers,
      'Cache-Control': 'no-store'
    }
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const configuredBase = getConfiguredApiBaseUrl()

  // Direct relay mode (local → V3)
  if (isDirectRelayEnabled()) {
    return buildDirectRelayResponse(body)
  }

  // Local mock mode (no API configured)
  if (!configuredBase) {
    return NextResponse.json(
      {
        user_id: 'local-dashboard',
        imageDataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxu...',
        filename: 'ion-dashboard-local-fallback.svg'
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  // Proxy mode → forward to configured API
  try {
    const response = await fetch(`${configuredBase}/api/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization')
          ? { Authorization: String(request.headers.get('authorization')) }
          : {})
      },
      cache: 'no-store',
      body: JSON.stringify(body)
    })

    const payload = await response.json().catch(() => ({
      error: 'Image proxy returned an invalid response.'
    }))

    return NextResponse.json(payload, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: `Image proxy failed: ${String(
          (error as Error)?.message || 'unknown error'
        )}`
      },
      {
        status: 502,
        headers: { 'Cache-Control': 'no-store' }
      }
    )
  }
}
