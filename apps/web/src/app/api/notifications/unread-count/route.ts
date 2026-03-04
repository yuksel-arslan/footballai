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
      return NextResponse.json({ success: false, data: { count: 0 } })
    }

    const res = await fetch(
      `${USER_SERVICE_URL}/api/notifications/unread-count`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    )

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, data: { count: 0 } })
  }
}
