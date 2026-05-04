import { NextResponse } from 'next/server'
import { getLocalBillingStatus } from '@/lib/local-auth-server'

export async function POST(request: Request) {
  const result = await getLocalBillingStatus(request)
  return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
}