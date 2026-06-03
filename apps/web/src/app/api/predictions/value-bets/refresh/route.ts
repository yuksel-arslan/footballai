import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

/**
 * POST /api/predictions/value-bets/refresh  (admin)
 * Triggers the cost-guarded value-bet recompute in match-service. The auth
 * cookie is forwarded as a Bearer token so the admin middleware accepts it.
 */
export async function POST(request: NextRequest) {
  if (!GATEWAY_URL) {
    return NextResponse.json(
      { success: false, error: 'not configured' },
      { status: 503 }
    )
  }
  const token = request.cookies.get('auth-token')?.value
  const force = new URL(request.url).searchParams.get('force')
  const qs = force ? `?force=${encodeURIComponent(force)}` : ''

  try {
    const res = await fetch(
      `${GATEWAY_URL}/api/predictions/value-bets/refresh${qs}`,
      {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        signal: AbortSignal.timeout(180000),
      }
    )
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, error: 'unavailable' },
      { status: 502 }
    )
  }
}
