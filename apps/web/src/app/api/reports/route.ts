import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

/**
 * GET /api/reports — latest post-match reports (proxies match-service).
 * Public and free; powers the "Maç Sonu" review page.
 */
export async function GET(request: NextRequest) {
  if (!GATEWAY_URL) {
    return NextResponse.json(
      { success: false, error: 'service not configured' },
      { status: 503 }
    )
  }
  const limit = request.nextUrl.searchParams.get('limit') ?? '20'
  try {
    const res = await fetch(
      `${GATEWAY_URL}/api/predictions/reports?limit=${encodeURIComponent(limit)}`,
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
