import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

/**
 * GET /api/reports/pre/status?fixtureId=N
 *
 * Proxies the pre-match report status (does it exist, has THIS viewer paid, is
 * it finished/live, does a prediction exist) to match-service. Auth cookie
 * forwarded as a Bearer token so "already paid → free re-view" resolves per
 * user.
 */
export async function GET(request: NextRequest) {
  if (!GATEWAY_URL) {
    return NextResponse.json(
      { success: false, error: 'service not configured' },
      { status: 503 }
    )
  }
  const fixtureId = request.nextUrl.searchParams.get('fixtureId') ?? ''
  const token = request.cookies.get('auth-token')?.value
  try {
    const res = await fetch(
      `${GATEWAY_URL}/api/predictions/pre-report/status?fixtureId=${encodeURIComponent(fixtureId)}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
      }
    )
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, error: 'status service unavailable' },
      { status: 502 }
    )
  }
}
