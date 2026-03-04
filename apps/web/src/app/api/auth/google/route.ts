import { NextRequest, NextResponse } from 'next/server'
import { USER_SERVICE_URL } from '@/lib/service-urls'
import { getGoogleAuthUrl } from '@/lib/auth-service'

export async function GET(request: NextRequest) {
  try {
    // Try backend service first if configured
    if (USER_SERVICE_URL) {
      try {
        const res = await fetch(`${USER_SERVICE_URL}/api/auth/google`, {
          method: 'GET',
          headers: {
            'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
            'User-Agent': request.headers.get('user-agent') || '',
          },
          redirect: 'manual',
          signal: AbortSignal.timeout(5000),
        })

        const location = res.headers.get('location')
        if (location) {
          return NextResponse.redirect(location)
        }
      } catch {
        // Backend unavailable, fall through to direct OAuth
      }
    }

    // Direct Google OAuth fallback
    const appUrl = new URL(request.url).origin
    const authUrl = getGoogleAuthUrl(appUrl)

    if (!authUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Google ile giriş yapılandırılmamış. GOOGLE_CLIENT_ID gerekli.',
        },
        { status: 503 }
      )
    }

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Google auth error:', error)
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 502 }
    )
  }
}
