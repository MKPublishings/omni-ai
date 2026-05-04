import { NextResponse } from 'next/server'
import { getLocalEntitlements } from '@/lib/local-auth-server'

export async function POST(request: Request) {
  const result = await getLocalEntitlements(request)
  return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
}