import { NextResponse } from 'next/server'
import { AUTH_CONFIG } from '@/lib/auth/config'

export async function GET() {
  const clientId = AUTH_CONFIG.GOOGLE_CLIENT_ID

  if (!clientId) {
    return NextResponse.json(
      { error: 'Google OAuth yapılandırılmamış' },
      { status: 500 }
    )
  }

  const redirectUri = `${AUTH_CONFIG.APP_URL}/api/auth/google/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  return NextResponse.redirect(authUrl)
}
