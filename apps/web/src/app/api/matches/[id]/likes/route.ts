import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

/**
 * GET  /api/matches/[id]/likes?voterId=  → like count + whether voter liked
 * POST /api/matches/[id]/likes  body { voterId }  → toggle, returns fresh state
 * Proxies match-service; public (anonymous voter id from the client).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!GATEWAY_URL) {
    return NextResponse.json({ success: false }, { status: 503 })
  }
  const voterId = request.nextUrl.searchParams.get('voterId') ?? ''
  try {
    const res = await fetch(
      `${GATEWAY_URL}/api/predictions/likes/${encodeURIComponent(id)}?voterId=${encodeURIComponent(voterId)}`,
      { signal: AbortSignal.timeout(10000), cache: 'no-store' }
    )
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false }, { status: 502 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!GATEWAY_URL) {
    return NextResponse.json({ success: false }, { status: 503 })
  }
  const body = await request.json().catch(() => ({}))
  try {
    const res = await fetch(
      `${GATEWAY_URL}/api/predictions/likes/${encodeURIComponent(id)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      }
    )
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false }, { status: 502 })
  }
}
