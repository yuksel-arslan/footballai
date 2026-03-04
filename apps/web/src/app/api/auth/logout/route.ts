import { NextRequest, NextResponse } from 'next/server'
import { USER_SERVICE_URL } from '@/lib/service-urls'

export async function POST(request: NextRequest) {
  try {
    if (!USER_SERVICE_URL) {
      return NextResponse.json(
        { success: false, error: 'User service not configured' },
        { status: 503 }
      )
    }

    const token = request.cookies.get('auth-token')?.value
    const res = await fetch(`${USER_SERVICE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token
          ? `Bearer ${token}`
          : request.headers.get('authorization') || '',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
        'User-Agent': request.headers.get('user-agent') || '',
      },
    })

    const data = await res.json()
    const response = NextResponse.json(data, { status: res.status })

    // Clear auth cookies
    response.cookies.set('auth-token', '', { maxAge: 0, path: '/' })
    response.cookies.set('user-role', '', { maxAge: 0, path: '/' })

    return response
  } catch (error) {
    console.error('Logout proxy error:', error)
    const response = NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 502 }
    )
    // Clear cookies even on error
    response.cookies.set('auth-token', '', { maxAge: 0, path: '/' })
    response.cookies.set('user-role', '', { maxAge: 0, path: '/' })
    return response
  }
}
