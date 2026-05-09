import { NextRequest, NextResponse } from 'next/server'

const MOCK_IMAGE_DATA_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIHZpZXdCb3g9IjAgMCAxMDI0IDEwMjQiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIHN0b3AtY29sb3I9IiMwYjE2MjAiLz48c3RvcCBvZmZzZXQ9IjAuNSIgc3RvcC1jb2xvcj0iIzEzM2I1ZSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzA4YmY5YiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIGZpbGw9InVybCgjZykiLz48Y2lyY2xlIGN4PSIyMDQiIGN5PSIyMjAiIHI9IjEyMCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjxjaXJjbGUgY3g9Ijc5MCIgY3k9IjMwMCIgcj0iMTgwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDYpIi8+PHBhdGggZD0iTTIwMCA3MjBjMTEwLTE2MCAyMjAtMjQwIDMzMC0yNDBzMjIwIDgwIDMzMCAyNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjE4KSIgc3Ryb2tlLXdpZHRoPSIzMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHRleHQgeD0iMTEwIiB5PSI4MjAiIGZpbGw9IiNlNmYyZmYiIGZvbnQtZmFtaWx5PSJHZW9yZ2lhLCBUaW1lcyBOZXcgUm9tYW4sIHNlcmlmIiBmb250LXNpemU9IjY0IjBmb250LXdlaWdodD0iNjAwIj5JT04gSW1hZ2U8L3RleHQ+PHRleHQgeD0iMTEwIiB5PSI4ODAiIGZpbGw9InJnYmEoMjMwLDI0MiwyNTUsMC43MikiIGZvbnQtZmFtaWx5PSJHZWFnaWEsIFRpbWVzIE5ldyBSb21hbiwgc2VyaWYiIGZvbnQtc2l6ZT0iMzAiPkRhc2hib2FyZCBsb2NhbCBpbWFnZSBmYWxsYmFjayBpcyBvbmxpbmUuPC90ZXh0Pjwvc3ZnPg=='

function getConfiguredApiBaseUrl(): string | null {
  const configuredBase = String(process.env.NEXT_PUBLIC_ION_API_URL || '').trim()
  return configuredBase ? configuredBase.replace(/\/+$/, '') : null
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
        checkpoint: 'noobai-xl-vpred-v1.0',
        outputModel: 'noobai-xl-vpred-v1.0',
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
  const body = await request.json().catch(() => ({})) as { prompt?: string }
  const configuredBase = getConfiguredApiBaseUrl()

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