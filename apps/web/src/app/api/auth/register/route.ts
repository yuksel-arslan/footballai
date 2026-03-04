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

    const body = await request.json()

    const res = await fetch(`${USER_SERVICE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
        'User-Agent': request.headers.get('user-agent') || '',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    const response = NextResponse.json(data, { status: res.status })

    // Set auth cookies on successful registration
    if (res.ok && data.token) {
      response.cookies.set('auth-token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      })

      if (data.user?.isAdmin) {
        response.cookies.set('user-role', 'admin', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        })
      }
    }

    return response
  } catch (error) {
    console.error('Register proxy error:', error)
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 502 }
    )
  }
}
