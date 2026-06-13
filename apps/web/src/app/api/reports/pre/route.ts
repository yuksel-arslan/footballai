import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

/**
 * POST /api/reports/pre
 *
 * Proxies to match-service's pre-match report ("Önce") endpoint: model
 * prediction + analysis + in-play read. Auth-gated and credit-paid (6 credits,
 * once per fixture); the auth cookie is forwarded as a Bearer token so the
 * gateway/match-service auth middleware accepts it.
 */
export async function POST(request: NextRequest) {
  if (!GATEWAY_URL) {
    return NextResponse.json(
      { success: false, error: 'service not configured' },
      { status: 503 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const token = request.cookies.get('auth-token')?.value

  try {
    const res = await fetch(`${GATEWAY_URL}/api/predictions/pre-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, error: 'report service unavailable' },
      { status: 502 }
    )
  }
}
