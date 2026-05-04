import { NextResponse } from 'next/server'
import { clearLocalChatHistory, getLocalChatHistory } from '@/lib/local-auth-server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { limit?: number }
  const result = await getLocalChatHistory(request, Number(body.limit || 120))
  return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
}

export async function DELETE(request: Request) {
  const result = await clearLocalChatHistory(request)
  return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
}