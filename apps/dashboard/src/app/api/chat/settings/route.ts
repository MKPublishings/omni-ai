import { NextResponse } from 'next/server'
import { getLocalChatSettings, updateLocalChatSettings } from '@/lib/local-auth-server'

export async function POST(request: Request) {
  const result = await getLocalChatSettings(request)
  return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}))
  const result = await updateLocalChatSettings(request, body)
  return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
}