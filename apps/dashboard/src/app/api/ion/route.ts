import { NextRequest, NextResponse } from 'next/server'

// Mock ION Ai responses for development
const mockResponses = [
  "I understand your request. As ION Ai, I'm processing this through my cognitive systems. The analysis shows promising patterns in the data you've provided.",
  "Based on my reasoning capabilities, I can see multiple pathways forward. Let me illuminate the key considerations for your decision.",
  "My vision systems have analyzed the information. The patterns suggest we should focus on the sovereign aspects of this implementation.",
  "Through cinematic reasoning, I envision a fluid transition between these states. The glass materials will breathe with ambient intelligence.",
  "The routing analysis indicates optimal flow through the three-zone architecture. Sanctuary, Performance, and Transition zones are well-balanced.",
  "My analysis reveals strong coherence in the design system. The token foundation provides excellent stability for the glass materials.",
  "I discern subtle opportunities for enhancement in the interaction patterns. The zone focus states could benefit from more pronounced light leaks.",
  "The orchestration pathways look solid. I'm routing this through my evaluation systems for deeper insight.",
  "From a multiverse perspective, this implementation shows excellent dimensional stability. The glass tiers maintain their integrity across contexts.",
  "My autonomous systems recommend proceeding with the current architecture. The ambient intelligence patterns are emerging beautifully."
]

function getRandomResponse() {
  return mockResponses[Math.floor(Math.random() * mockResponses.length)]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const latestMessage = typeof body?.message === 'string'
      ? body.message
      : Array.isArray(body?.messages)
        ? [...body.messages].reverse().find((entry) => entry?.role === 'user' && typeof entry?.content === 'string')?.content
        : ''
    const mode = typeof body?.mode === 'string' ? body.mode : 'analysis'

    if (!latestMessage) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Simulate ION Ai processing time
    const processingTime = Math.random() * 2000 + 1000 // 1-3 seconds

    await new Promise(resolve => setTimeout(resolve, processingTime))

    // Generate response based on mode
    let response: string
    switch (mode) {
      case 'reasoning':
        response = `Through sovereign reasoning: ${getRandomResponse()}`
        break
      case 'vision':
        response = `My vision systems discern: ${getRandomResponse()}`
        break
      case 'cinematic':
        response = `Cinematically envisioning: ${getRandomResponse()}`
        break
      case 'routing':
        response = `Routing analysis reveals: ${getRandomResponse()}`
        break
      default:
        response = `Prompt received: ${latestMessage.slice(0, 160)}\n\n${getRandomResponse()}`
    }

    return NextResponse.json({
      response,
      mode,
      processingTime: Math.round(processingTime),
      timestamp: new Date().toISOString(),
      ionVersion: '1.0.0'
    })

  } catch (error) {
    console.error('ION Ai API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}