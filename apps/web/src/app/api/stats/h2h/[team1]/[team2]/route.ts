import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL =
  process.env.API_GATEWAY_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ team1: string; team2: string }> }
) {
  try {
    const { team1, team2 } = await params

    const res = await fetch(`${GATEWAY_URL}/api/stats/h2h/${team1}/${team2}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('[H2H Proxy]', error)
    return NextResponse.json(
      { success: false, error: 'Stats service unavailable' },
      { status: 502 }
    )
  }
}
