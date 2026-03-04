import { NextRequest, NextResponse } from 'next/server'
import { USER_SERVICE_URL } from '@/lib/service-urls'
import { verifyToken, getUserById } from '@/lib/auth-service'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const authHeader = token
      ? `Bearer ${token}`
      : request.headers.get('authorization') || ''

    if (!authHeader && !token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Try backend service first if configured
    if (USER_SERVICE_URL) {
      try {
        const res = await fetch(`${USER_SERVICE_URL}/api/auth/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          signal: AbortSignal.timeout(5000),
        })

        if (res.ok) {
          const data = await res.json()
          return NextResponse.json(data)
        }
      } catch {
        // Backend unavailable, fall through to direct auth
      }
    }

    // Direct auth via JWT + Prisma
    const jwtToken = token || authHeader.replace('Bearer ', '')
    const decoded = verifyToken(jwtToken)

    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const user = await getUserById(decoded.userId)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      )
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 401 }
    )
  }
}
