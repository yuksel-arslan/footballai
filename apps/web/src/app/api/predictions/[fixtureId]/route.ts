import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL =
  process.env.API_GATEWAY_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  try {
    const { fixtureId } = await params
    const token = request.headers.get('authorization') || ''

    const res = await fetch(`${GATEWAY_URL}/api/predictions/${fixtureId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      signal: AbortSignal.timeout(15000),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('[Prediction Proxy]', error)
    return NextResponse.json(
      { success: false, error: 'Prediction service unavailable' },
      { status: 502 }
    )
  }
}
