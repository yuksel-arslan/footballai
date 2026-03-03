import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL =
  process.env.API_GATEWAY_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
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
