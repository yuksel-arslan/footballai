import { NextRequest, NextResponse } from 'next/server'
import { USER_SERVICE_URL } from '@/lib/service-urls'
import { verifyToken } from '@/lib/auth-service'
import { getUnreadCount } from '@/lib/db-service'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ success: false, data: { count: 0 } })
    }

    // Try backend service first if configured
    if (USER_SERVICE_URL) {
      try {
        const res = await fetch(
          `${USER_SERVICE_URL}/api/notifications/unread-count`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            signal: AbortSignal.timeout(5000),
          }
        )

        if (res.ok) {
          const data = await res.json()
          return NextResponse.json(data, { status: res.status })
        }
      } catch {
        // Backend unavailable, fall through to direct DB
      }
    }

    // Direct DB fallback
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, data: { count: 0 } })
    }

    const result = await getUnreadCount(decoded.userId)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ success: false, data: { count: 0 } })
  }
}
