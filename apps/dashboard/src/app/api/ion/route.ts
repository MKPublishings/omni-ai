import { NextResponse } from 'next/server'

function getConfiguredApiBaseUrl(): string | null {
  const configuredBase = String(process.env.NEXT_PUBLIC_ION_API_URL || '').trim()
  return configuredBase ? configuredBase.replace(/\/+$/, '') : null
}

export async function POST(request: Request) {
  const configuredBase = getConfiguredApiBaseUrl()
  if (!configuredBase) {
    return NextResponse.json(
      {
        error: 'The dashboard local /api/ion proxy is not configured. Set NEXT_PUBLIC_ION_API_URL or use the remote worker target.',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }

  const incomingUrl = new URL(request.url)
  const upstreamUrl = `${configuredBase}/api/ION${incomingUrl.search}`
  const method = request.method.toUpperCase()
  const headers = new Headers(request.headers)

  headers.delete('host')
  headers.delete('content-length')

  if (!headers.has('Content-Type') && !['GET', 'HEAD'].includes(method)) {
    headers.set('Content-Type', 'application/json')
  }

  const init: RequestInit = {
    method,
    headers,
    redirect: 'follow',
    cache: 'no-store',
  }

  if (!['GET', 'HEAD'].includes(method)) {
    init.body = await request.arrayBuffer()
  }

  try {
    const upstream = await fetch(upstreamUrl, init)
    const responseHeaders = new Headers(upstream.headers)
    if (!responseHeaders.has('Cache-Control')) {
      responseHeaders.set('Cache-Control', 'no-store')
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: `ION upstream request failed: ${String((error as Error)?.message || 'unknown error')}`,
      },
      {
        status: 502,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }
}