import { NextRequest, NextResponse } from 'next/server'

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getUpstreamBaseUrl(request: NextRequest): string | null {
  const configuredBase = process.env.ION_API_URL?.trim() || process.env.NEXT_PUBLIC_ION_API_URL?.trim()
  if (configuredBase) {
    return configuredBase.replace(/\/+$/, '')
  }

  const requestUrl = new URL(request.url)
  if (requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1') {
    return null
  }

  return requestUrl.origin
}

export async function GET(request: NextRequest) {
  try {
    const upstreamBaseUrl = getUpstreamBaseUrl(request)

    if (!upstreamBaseUrl) {
      return NextResponse.json(
        { error: 'ION stats endpoint is not configured for local static dashboard usage.' },
        { status: 503, headers: NO_STORE_HEADERS }
      )
    }

    const upstreamResponse = await fetch(`${upstreamBaseUrl}/api/system/status?_=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: 'Live stats upstream is unavailable.' },
        { status: upstreamResponse.status, headers: NO_STORE_HEADERS }
      )
    }

    const payload = await upstreamResponse.json() as {
      status?: string
      timestamp?: string
      counts?: {
        authUsers?: number
        sessions?: number
        toolExecutions?: number
        simulationRuns?: number
      }
    }

    return NextResponse.json(
      {
        registeredUsers: payload.counts?.authUsers ?? 0,
        activeSessions: payload.counts?.sessions ?? 0,
        toolExecutions: payload.counts?.toolExecutions ?? 0,
        simulationRuns: payload.counts?.simulationRuns ?? 0,
        status: payload.status || 'unknown',
        timestamp: payload.timestamp || new Date().toISOString(),
      },
      { headers: NO_STORE_HEADERS }
    )
  } catch (error) {
    console.error('Stats API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: NO_STORE_HEADERS }
    )
  }
}