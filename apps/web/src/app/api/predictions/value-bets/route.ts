import { NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

const EMPTY = { success: true, data: { updatedAt: null, items: [] } }

/**
 * GET /api/predictions/value-bets
 * Public, cheap — serves the pre-computed value-bet cache from match-service.
 */
export async function GET() {
  if (!GATEWAY_URL) return NextResponse.json(EMPTY)
  try {
    const res = await fetch(`${GATEWAY_URL}/api/predictions/value-bets`, {
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    const data = await res.json().catch(() => EMPTY)
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(EMPTY)
  }
}
