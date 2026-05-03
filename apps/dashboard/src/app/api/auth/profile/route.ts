import { NextResponse } from 'next/server'
import { updateLocalProfile } from '@/lib/local-auth-server'

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}))
  const result = await updateLocalProfile(request, body)
  return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
}