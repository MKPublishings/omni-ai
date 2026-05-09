import assert from 'node:assert/strict'
import test from 'node:test'

import { POST } from '../app/api/ion/route'

test('dashboard /api/ion route returns 503 when no upstream worker is configured', async () => {
  const previousApiUrl = process.env.NEXT_PUBLIC_ION_API_URL
  delete process.env.NEXT_PUBLIC_ION_API_URL

  try {
    const response = await POST(new Request('http://localhost/api/ion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
    }))

    assert.equal(response.status, 503)
    const payload = await response.json()
    assert.match(String(payload.error || ''), /not configured/i)
  } finally {
    if (typeof previousApiUrl === 'string') {
      process.env.NEXT_PUBLIC_ION_API_URL = previousApiUrl
    }
  }
})

test('dashboard /api/ion route forwards body, auth, and query string to the upstream worker', async () => {
  const previousApiUrl = process.env.NEXT_PUBLIC_ION_API_URL
  process.env.NEXT_PUBLIC_ION_API_URL = 'https://ion.example.test'

  const originalFetch = globalThis.fetch
  const fetchCalls: Array<{ input: string; init?: RequestInit }> = []

  globalThis.fetch = async (input, init) => {
    fetchCalls.push({ input: String(input), init })
    return new Response('data: {"content":"ok"}\n\n', {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
      },
    })
  }

  try {
    const response = await POST(new Request('http://localhost/api/ion?fast=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        mode: 'auto',
        messages: [{ role: 'user', content: 'stream this' }],
      }),
    }))

    assert.equal(fetchCalls.length, 1)
    assert.equal(fetchCalls[0]?.input, 'https://ion.example.test/api/ION?fast=true')
    assert.equal(fetchCalls[0]?.init?.method, 'POST')
    const forwardedHeaders = fetchCalls[0]?.init?.headers as Headers
    assert.equal(forwardedHeaders.get('Authorization'), 'Bearer test-token')
    assert.equal(forwardedHeaders.get('Content-Type'), 'application/json')
    const forwardedBody = fetchCalls[0]?.init?.body as ArrayBuffer
    const decoded = JSON.parse(new TextDecoder().decode(forwardedBody))
    assert.equal(decoded.mode, 'auto')
    assert.equal(decoded.messages[0]?.content, 'stream this')
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Content-Type'), 'text/event-stream')
    assert.match(await response.text(), /"content":"ok"/)
  } finally {
    globalThis.fetch = originalFetch
    if (typeof previousApiUrl === 'string') {
      process.env.NEXT_PUBLIC_ION_API_URL = previousApiUrl
    } else {
      delete process.env.NEXT_PUBLIC_ION_API_URL
    }
  }
})