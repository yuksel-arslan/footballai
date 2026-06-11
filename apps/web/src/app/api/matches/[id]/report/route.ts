import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

/**
 * GET /api/matches/[id]/report
 * Proxies to match-service's post-match report endpoint (public, free).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!GATEWAY_URL) {
    return NextResponse.json(
      { success: false, error: 'service not configured' },
      { status: 503 }
    )
  }
  try {
    const res = await fetch(
      `${GATEWAY_URL}/api/predictions/report/${encodeURIComponent(id)}`,
      { signal: AbortSignal.timeout(20000), cache: 'no-store' }
    )
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, error: 'report service unavailable' },
      { status: 502 }
    )
  }
}
