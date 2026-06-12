import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

/**
 * GET /api/analytics?league=&home=&away= — proxies match-service's measured
 * analytics (strength/form indices + player metrics). Public, cached upstream.
 */
export async function GET(request: NextRequest) {
  if (!GATEWAY_URL) {
    return NextResponse.json(
      { success: false, error: 'service not configured' },
      { status: 503 }
    )
  }
  const qs = request.nextUrl.search || ''
  try {
    const res = await fetch(`${GATEWAY_URL}/api/predictions/analytics${qs}`, {
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, error: 'analytics unavailable' },
      { status: 502 }
    )
  }
}
