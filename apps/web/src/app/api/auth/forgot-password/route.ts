import { NextRequest, NextResponse } from 'next/server'
import { USER_SERVICE_URL } from '@/lib/service-urls'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!USER_SERVICE_URL) {
      // Return success-like response to avoid leaking service status
      return NextResponse.json({
        success: true,
        message:
          'Eğer bu e-posta kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.',
      })
    }

    const res = await fetch(`${USER_SERVICE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
        'User-Agent': request.headers.get('user-agent') || '',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Forgot password proxy error:', error)
    return NextResponse.json({
      success: true,
      message:
        'Eğer bu e-posta kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.',
    })
  }
}
