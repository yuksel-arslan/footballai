import { NextRequest, NextResponse } from 'next/server'
import { USER_SERVICE_URL } from '@/lib/service-urls'
import { loginUser } from '@/lib/auth-service'
import { toTurkishAuthError } from '@/lib/auth-errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'E-posta ve şifre gerekli' },
        { status: 400 }
      )
    }

    // Try backend service first if configured
    if (USER_SERVICE_URL) {
      try {
        const res = await fetch(`${USER_SERVICE_URL}/api/auth/login`, {
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
        // Backend may wrap the payload as { success, data: { user, token } }
        // or return it flat. Normalize token/user to the top level so the
        // client (and setCookies) can read them consistently.
        const token = data.token ?? data.data?.token
        const user = data.user ?? data.data?.user
        const normalized = {
          ...data,
          ...(user ? { user } : {}),
          ...(token ? { token } : {}),
          ...(!res.ok
            ? { error: toTurkishAuthError(data, 'Giriş başarısız oldu.') }
            : {}),
        }
        const response = NextResponse.json(normalized, { status: res.status })

        if (res.ok && token) {
          setCookies(response, { token, user })
        }

        return response
      } catch {
        // Backend unavailable, fall through to direct auth
      }
    }

    // Direct auth via Prisma
    const result = await loginUser(email, password)

    if ('requires2FA' in result && result.requires2FA) {
      return NextResponse.json({
        success: true,
        requires2FA: true,
        userId: result.userId,
      })
    }

    const response = NextResponse.json({
      success: true,
      user: result.user,
      token: result.token,
    })

    setCookies(response, result as { token: string; user: any })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Giriş başarısız'
    return NextResponse.json(
      { success: false, error: message },
      { status: 401 }
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
