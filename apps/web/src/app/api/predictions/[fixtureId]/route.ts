import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  try {
    if (!GATEWAY_URL) {
      return NextResponse.json(
        { success: false, error: 'Backend service not configured' },
        { status: 503 }
      )
    }

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
