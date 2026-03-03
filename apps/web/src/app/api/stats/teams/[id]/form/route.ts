import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const res = await fetch(`${GATEWAY_URL}/api/stats/teams/${id}/form`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('[Team Form Proxy]', error)
    return NextResponse.json(
      { success: false, error: 'Stats service unavailable' },
      { status: 502 }
    )
  }
}
