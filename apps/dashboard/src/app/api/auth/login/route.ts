import { NextRequest, NextResponse } from 'next/server'
import { sign, verify } from 'jsonwebtoken'

// Simple in-memory user store for demo (in production, use database)
const users = [
  {
    id: '1',
    email: 'mirnes@ionirix.com',
    password: 'sovereign2026', // In production, hash passwords
    name: 'Mirnes',
    role: 'admin',
    ionApiKey: process.env.ION_API_KEY || 'demo-key'
  }
]

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'ionirix-sovereign-secret-2026'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user
    const user = users.find(u => u.email === email && u.password === password)

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        ionApiKey: user.ionApiKey
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    // Create response with user data (excluding password)
    const { password: _, ...userData } = user

    return NextResponse.json({
      token,
      user: userData,
      expiresIn: '24h'
    })

  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Validate token endpoint
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // Remove 'Bearer '

    try {
      const decoded = verify(token, JWT_SECRET) as any

      // Find user to ensure they still exist
      const user = users.find(u => u.id === decoded.userId)
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        )
      }

      const { password: _, ...userData } = user

      return NextResponse.json({
        valid: true,
        user: userData
      })

    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}