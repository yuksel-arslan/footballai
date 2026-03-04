import { NextRequest, NextResponse } from 'next/server'
import { USER_SERVICE_URL } from '@/lib/service-urls'

export async function GET(request: NextRequest) {
  try {
    if (!USER_SERVICE_URL) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Google ile giriş şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
        },
        { status: 503 }
      )
    }

    const res = await fetch(`${USER_SERVICE_URL}/api/auth/google`, {
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
      return NextResponse.redirect(location)
    }

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Google auth proxy error:', error)
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 502 }
    )
  }
}
