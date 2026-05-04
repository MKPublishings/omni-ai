import { NextResponse } from 'next/server'
import { createLocalAuth0Session } from '@/lib/local-auth-server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const result = await createLocalAuth0Session(request, body)
  return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
}