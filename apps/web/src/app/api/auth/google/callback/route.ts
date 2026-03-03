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
      return NextResponse.redirect(location)
    }

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Google callback proxy error:', error)
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 502 }
    )
  }
}
