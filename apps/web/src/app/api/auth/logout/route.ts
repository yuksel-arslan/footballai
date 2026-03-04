import { NextRequest, NextResponse } from 'next/server'
import { USER_SERVICE_URL } from '@/lib/service-urls'

export async function POST(request: NextRequest) {
  // Try backend service if configured
  if (USER_SERVICE_URL) {
    try {
      const token = request.cookies.get('auth-token')?.value
      await fetch(`${USER_SERVICE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        signal: AbortSignal.timeout(5000),
      })
    } catch {
      // Ignore backend errors on logout
    }
  }

  // Always clear cookies and return success
  const response = NextResponse.json({ success: true, message: 'Logged out' })
  response.cookies.set('auth-token', '', { maxAge: 0, path: '/' })
  response.cookies.set('user-role', '', { maxAge: 0, path: '/' })

  return response
}
