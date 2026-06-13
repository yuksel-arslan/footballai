import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

/**
 * GET /api/reports/cards — the reports list (upcoming + finished match cards,
 * each with Önce/Sonra availability). Proxies match-service; public and free.
 */
export async function GET(request: NextRequest) {
  if (!GATEWAY_URL) {
    return NextResponse.json(
      { success: false, error: 'service not configured' },
      { status: 503 }
    )
  }
  const limit = request.nextUrl.searchParams.get('limit') ?? '30'
  try {
    const res = await fetch(
      `${GATEWAY_URL}/api/predictions/report-cards?limit=${encodeURIComponent(limit)}`,
      { signal: AbortSignal.timeout(15000), cache: 'no-store' }
    )
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, error: 'reports unavailable' },
      { status: 502 }
    )
  }
}
