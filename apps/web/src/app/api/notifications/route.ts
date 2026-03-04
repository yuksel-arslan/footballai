import { NextRequest, NextResponse } from 'next/server'
import { USER_SERVICE_URL } from '@/lib/service-urls'

export async function GET(request: NextRequest) {
  try {
    if (!USER_SERVICE_URL) {
      return NextResponse.json(
        { success: false, error: 'User service not configured' },
        { status: 503 }
      )
    }

    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'

    const res = await fetch(
      `${USER_SERVICE_URL}/api/notifications?page=${page}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    )

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Notifications GET proxy error:', error)
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 502 }
    )
  }
}
