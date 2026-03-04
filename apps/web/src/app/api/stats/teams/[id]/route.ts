import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!GATEWAY_URL) {
      return NextResponse.json(
        { success: false, error: 'Backend service not configured' },
        { status: 503 }
      )
    }

    const { id } = await params

    const res = await fetch(`${GATEWAY_URL}/api/stats/teams/${id}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('[Team Stats Proxy]', error)
    return NextResponse.json(
      { success: false, error: 'Stats service unavailable' },
      { status: 502 }
    )
  }
}
