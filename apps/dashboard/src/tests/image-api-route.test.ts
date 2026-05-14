import assert from 'node:assert/strict'
import test from 'node:test'

import { POST } from '../app/api/route'

test('dashboard /api/image route forwards body to the upstream worker when direct relay is disabled', async () => {
  const previousApiUrl = process.env.NEXT_PUBLIC_ION_API_URL
  const previousDirectRelay = process.env.DASHBOARD_IMAGE_DIRECT_RELAY
  process.env.NEXT_PUBLIC_ION_API_URL = 'https://ion.example.test'
  delete process.env.DASHBOARD_IMAGE_DIRECT_RELAY

  const originalFetch = globalThis.fetch
  const fetchCalls: Array<{ input: string; init?: RequestInit }> = []

  globalThis.fetch = async (input, init) => {
    fetchCalls.push({ input: String(input), init })
    return Response.json({ ok: true }, { status: 202 })
  }

  try {
    const response = await POST(new Request('http://localhost/api/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ prompt: 'proxy this image' }),
    }) as never)

    assert.equal(fetchCalls.length, 1)
    assert.equal(fetchCalls[0]?.input, 'https://ion.example.test/api/image')
    assert.equal(fetchCalls[0]?.init?.method, 'POST')
    const forwardedHeaders = new Headers(fetchCalls[0]?.init?.headers as HeadersInit)
    assert.equal(forwardedHeaders.get('Authorization'), 'Bearer test-token')
    assert.equal(forwardedHeaders.get('Content-Type'), 'application/json')
    assert.equal(response.status, 202)
  } finally {
    globalThis.fetch = originalFetch
    if (typeof previousApiUrl === 'string') {
      process.env.NEXT_PUBLIC_ION_API_URL = previousApiUrl
    } else {
      delete process.env.NEXT_PUBLIC_ION_API_URL
    }
    if (typeof previousDirectRelay === 'string') {
      process.env.DASHBOARD_IMAGE_DIRECT_RELAY = previousDirectRelay
    } else {
      delete process.env.DASHBOARD_IMAGE_DIRECT_RELAY
    }
  }
})

test('dashboard /api/image route executes the direct relay pipeline with the mock gateway', async () => {
  const previousApiUrl = process.env.NEXT_PUBLIC_ION_API_URL
  const previousDirectRelay = process.env.DASHBOARD_IMAGE_DIRECT_RELAY
  const previousV3Relay = process.env.DASHBOARD_IMAGE_PIPELINE_V3
  const previousMock = process.env.ION_MOCK
  const previousCheckpoint = process.env.DEFAULT_CHECKPOINT
  const previousPrimaryProvider = process.env.ION_IMAGE_PROVIDER_PRIMARY
  const previousFallbackProvider = process.env.ION_IMAGE_PROVIDER_FALLBACK
  delete process.env.NEXT_PUBLIC_ION_API_URL
  process.env.DASHBOARD_IMAGE_DIRECT_RELAY = 'true'
  process.env.DASHBOARD_IMAGE_PIPELINE_V3 = 'true'
  process.env.ION_MOCK = 'true'
  process.env.DEFAULT_CHECKPOINT = 'ion-citizen-xl-vpred-v2.0'
  process.env.ION_IMAGE_PROVIDER_PRIMARY = 'ion-native'
  process.env.ION_IMAGE_PROVIDER_FALLBACK = 'none'

  try {
    const response = await POST(new Request('http://localhost/api/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'dashboard-test',
        prompt: 'draw a cozy study scene',
        stylePack: 'lofi',
        quality: 'ultra',
      }),
    }) as never)

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('X-ION-Image-Route'), 'image-gen-v3')
    assert.equal(response.headers.get('X-ION-Image-Provider'), 'ion-native')
    const payload = await response.json()
    assert.equal(payload.user_id, 'dashboard-test')
    assert.equal(payload.metadata?.pipeline?.gateway, 'mock')
    assert.equal(payload.metadata?.request?.styleFamily, 'lofi_aesthetic')
    assert.match(String(payload.imageDataUrl || ''), /^data:image\//)
  } finally {
    if (typeof previousApiUrl === 'string') {
      process.env.NEXT_PUBLIC_ION_API_URL = previousApiUrl
    } else {
      delete process.env.NEXT_PUBLIC_ION_API_URL
    }
    if (typeof previousDirectRelay === 'string') {
      process.env.DASHBOARD_IMAGE_DIRECT_RELAY = previousDirectRelay
    } else {
      delete process.env.DASHBOARD_IMAGE_DIRECT_RELAY
    }
    if (typeof previousV3Relay === 'string') {
      process.env.DASHBOARD_IMAGE_PIPELINE_V3 = previousV3Relay
    } else {
      delete process.env.DASHBOARD_IMAGE_PIPELINE_V3
    }
    if (typeof previousMock === 'string') {
      process.env.ION_MOCK = previousMock
    } else {
      delete process.env.ION_MOCK
    }
    if (typeof previousCheckpoint === 'string') {
      process.env.DEFAULT_CHECKPOINT = previousCheckpoint
    } else {
      delete process.env.DEFAULT_CHECKPOINT
    }
    if (typeof previousPrimaryProvider === 'string') {
      process.env.ION_IMAGE_PROVIDER_PRIMARY = previousPrimaryProvider
    } else {
      delete process.env.ION_IMAGE_PROVIDER_PRIMARY
    }
    if (typeof previousFallbackProvider === 'string') {
      process.env.ION_IMAGE_PROVIDER_FALLBACK = previousFallbackProvider
    } else {
      delete process.env.ION_IMAGE_PROVIDER_FALLBACK
    }
  }
})