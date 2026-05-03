import { NextResponse } from 'next/server'
import { signupLocalUser } from '@/lib/local-auth-server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const result = await signupLocalUser(request, body)
  return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
}