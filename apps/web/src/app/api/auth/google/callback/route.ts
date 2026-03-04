import { NextRequest, NextResponse } from 'next/server'
import { USER_SERVICE_URL } from '@/lib/service-urls'
import { handleGoogleCallback } from '@/lib/auth-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.redirect(
        new URL('/login?error=google_failed', request.url)
      )
    }

    // Try backend service first if configured
    if (USER_SERVICE_URL) {
      try {
        const queryString = searchParams.toString()
        const res = await fetch(
          `${USER_SERVICE_URL}/api/auth/google/callback?${queryString}`,
          {
            method: 'GET',
            headers: {
              'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
              'User-Agent': request.headers.get('user-agent') || '',
            },
            redirect: 'manual',
            signal: AbortSignal.timeout(10000),
          }
        )

        const location = res.headers.get('location')
        if (location) {
          return NextResponse.redirect(location)
        }

        if (res.ok) {
          const data = await res.json()
          const response = NextResponse.redirect(new URL('/', request.url))

          if (data.token) {
            setCookies(response, data)
          }

          return response
        }
      } catch {
        // Backend unavailable, fall through to direct OAuth
      }
    }

    // Direct Google OAuth fallback
    const appUrl = new URL(request.url).origin
    const ip = request.headers.get('x-forwarded-for') || ''
    const userAgent = request.headers.get('user-agent') || ''

    const result = await handleGoogleCallback(code, appUrl, ip, userAgent)

    const response = NextResponse.redirect(new URL('/', request.url))
    setCookies(response, result)

    return response
  } catch (error) {
    console.error('Google callback error:', error)
    return NextResponse.redirect(
      new URL('/login?error=google_failed', request.url)
    )
  }
}

function setCookies(
  response: NextResponse,
  data: { token: string; user?: any }
) {
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
