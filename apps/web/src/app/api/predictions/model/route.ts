import { NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

export async function GET() {
  try {
    if (!GATEWAY_URL) {
      return NextResponse.json(
        { success: false, error: 'Backend service not configured' },
        { status: 503 }
      )
    }

    const res = await fetch(`${GATEWAY_URL}/api/predictions/model/info`, {
      signal: AbortSignal.timeout(5000),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, error: 'ML service unavailable' },
      { status: 502 }
    )
  }
}
