import { NextRequest, NextResponse } from 'next/server'

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3003'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()

    const res = await fetch(`${USER_SERVICE_URL}/api/auth/google/callback?${queryString}`, {
      method: 'GET',
      headers: {
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
        'User-Agent': request.headers.get('user-agent') || '',
      },
      redirect: 'manual',
    })

    // Forward redirect from user-service
    const location = res.headers.get('location')
    if (location) {
      const redirectRes = NextResponse.redirect(location)
      return redirectRes
    }

    const data = await res.json()
    const response = NextResponse.redirect(new URL('/', request.url))

    // Set auth cookies on successful Google OAuth
    if (res.ok && data.token) {
      response.cookies.set('auth-token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
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
    console.error('Google callback proxy error:', error)
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 502 }
    )
  }
}
