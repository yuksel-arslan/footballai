import { NextRequest, NextResponse } from 'next/server'

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3003'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const res = await fetch(`${USER_SERVICE_URL}/api/profile/predictions/stats`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Prediction stats proxy error:', error)
    return NextResponse.json({ success: false, error: 'Service unavailable' }, { status: 502 })
  }
}
