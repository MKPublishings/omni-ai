import { NextResponse } from 'next/server'
import { verifyLocalEmail } from '@/lib/local-auth-server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { token?: string }
  const result = await verifyLocalEmail(request, body.token || '')
  return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
}