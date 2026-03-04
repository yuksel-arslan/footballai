import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

export async function POST(request: NextRequest) {
  try {
    if (!GATEWAY_URL) {
      return NextResponse.json(
        { success: false, error: 'Backend service not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()

    const res = await fetch(`${GATEWAY_URL}/api/predictions/ml`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('[ML Prediction Proxy]', error)
    return NextResponse.json(
      { success: false, error: 'ML service unavailable' },
      { status: 502 }
    )
  }
}
