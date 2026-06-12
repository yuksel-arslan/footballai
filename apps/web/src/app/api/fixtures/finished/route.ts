import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

/**
 * GET /api/fixtures/finished — proxies match-service's DB list (rows whose
 * status flipped to FINISHED by the live updater / finalize cron).
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
    const res = await fetch(`${GATEWAY_URL}/api/fixtures/finished${qs}`, {
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, error: 'fixtures unavailable' },
      { status: 502 }
    )
  }
}
