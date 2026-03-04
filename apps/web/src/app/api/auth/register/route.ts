import { NextRequest, NextResponse } from 'next/server'
import { USER_SERVICE_URL } from '@/lib/service-urls'
import { registerUser } from '@/lib/auth-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, fullName, name } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'E-posta ve şifre gerekli' },
        { status: 400 }
      )
    }

    // Try backend service first if configured
    if (USER_SERVICE_URL) {
      try {
        const res = await fetch(`${USER_SERVICE_URL}/api/auth/register`, {
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
        const response = NextResponse.json(data, { status: res.status })

        if (res.ok && data.token) {
          setCookies(response, data)
        }

        return response
      } catch {
        // Backend unavailable, fall through to direct auth
      }
    }

    // Direct auth via Prisma
    const result = await registerUser(email, password, fullName || name)

    const response = NextResponse.json(
      { success: true, user: result.user, token: result.token },
      { status: 201 }
    )

    setCookies(response, result)

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kayıt başarısız'
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    )
  }
}

function setCookies(
  response: NextResponse,
  data: { token: string; user: any }
) {
  response.cookies.set('auth-token', data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })

  if (data.user?.isAdmin) {
    response.cookies.set('user-role', 'admin', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
  }
}
