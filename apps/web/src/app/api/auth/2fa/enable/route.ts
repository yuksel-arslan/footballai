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

    const res = await fetch(`${USER_SERVICE_URL}/api/auth/2fa/enable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('authorization') || '',
        Cookie: request.headers.get('cookie') || '',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
        'User-Agent': request.headers.get('user-agent') || '',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('2FA enable proxy error:', error)
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 502 }
    )
  }
}
