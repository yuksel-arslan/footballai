import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

/**
 * GET /api/predictions/dixon-coles/:fixtureId
 *
 * Public, read-only, credit-free Dixon-Coles + value analysis for one fixture
 * — the automatic "Değer Sinyali" card. Proxies to match-service, which
 * computes once per fixture and caches; no manual odds entry, no charge.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  const { fixtureId } = await params
  if (!GATEWAY_URL) {
    return NextResponse.json(
      { success: false, error: 'prediction service not configured' },
      { status: 503 }
    )
  }
  try {
    const res = await fetch(
      `${GATEWAY_URL}/api/predictions/dixon-coles/${fixtureId}`,
      { signal: AbortSignal.timeout(20000), cache: 'no-store' }
    )
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, error: 'prediction service unavailable' },
      { status: 502 }
    )
  }
}
