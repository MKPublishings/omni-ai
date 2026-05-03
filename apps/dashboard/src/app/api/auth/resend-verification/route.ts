import { NextResponse } from 'next/server'
import { resendLocalVerification } from '@/lib/local-auth-server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { identifier?: string; email?: string }
  const result = await resendLocalVerification(request, String(body.identifier || body.email || ''))
  return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
}