import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-service'

/**
 * GET /auth/callback?token=<jwt>
 *
 * Safety-net handler for OAuth flows that redirect the browser back with the
 * JWT in the query string (e.g. older backend `googleCallback` builds that did
 * `res.redirect('/auth/callback?token=...')`). Without this, those redirects
 * land on a non-existent page and 404.
 *
 * The primary, more secure flow is `/api/auth/google/callback`, which sets the
 * cookie server-side without ever exposing the token in the URL. This handler
 * just converts a token-in-URL redirect into the same httpOnly cookie + home
 * redirect so the user ends up authenticated either way.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(
      new URL('/login?error=google_failed', request.url)
    )
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.redirect(
      new URL('/login?error=invalid_token', request.url)
    )
  }

  const response = NextResponse.redirect(new URL('/', request.url))

  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })

  if (payload.isAdmin) {
    response.cookies.set('user-role', 'admin', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
  }

  return response
}
