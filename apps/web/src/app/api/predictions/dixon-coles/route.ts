import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

/**
 * POST /api/predictions/dixon-coles
 *
 * Proxies to the API gateway → match-service → ml-service Dixon-Coles +
 * value-bet engine. The auth cookie is forwarded as a Bearer token so the
 * gateway/match-service auth middleware accepts the request (premium feature).
 */
export async function POST(request: NextRequest) {
  if (!GATEWAY_URL) {
    return NextResponse.json(
      { success: false, error: 'prediction service not configured' },
      { status: 503 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const token = request.cookies.get('auth-token')?.value

  try {
    const res = await fetch(`${GATEWAY_URL}/api/predictions/dixon-coles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    })

    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, error: 'prediction service unavailable' },
      { status: 502 }
    )
  }
}
