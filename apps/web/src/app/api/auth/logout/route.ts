import { NextRequest, NextResponse } from 'next/server'

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3003'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const res = await fetch(`${USER_SERVICE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : (request.headers.get('authorization') || ''),
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
