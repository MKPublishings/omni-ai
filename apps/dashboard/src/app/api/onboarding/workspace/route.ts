import { NextResponse } from 'next/server'
import { getLocalWorkspace, provisionLocalWorkspace } from '@/lib/local-auth-server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const hasWorkspacePayload = Boolean(
    body
      && typeof body === 'object'
      && 'formation' in body
      && 'context' in body
  )
  const result = hasWorkspacePayload
    ? await provisionLocalWorkspace(request, body as Parameters<typeof provisionLocalWorkspace>[1])
    : await getLocalWorkspace(request)
  return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
}