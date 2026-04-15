import { NextResponse } from 'next/server'

// Mock real-time system stats
function generateStats() {
  const baseUsers = 12847
  const baseLoad = 68
  const baseQueries = 3429

  return {
    activeUsers: baseUsers + Math.floor(Math.random() * 200) - 100,
    systemLoad: Math.max(0, Math.min(100, baseLoad + Math.floor(Math.random() * 10) - 5)),
    aiQueries: baseQueries + Math.floor(Math.random() * 100) - 50,
    timestamp: new Date().toISOString()
  }
}

export async function GET() {
  try {
    const stats = generateStats()

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Stats API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}