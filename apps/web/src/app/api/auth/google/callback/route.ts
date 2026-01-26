import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@football-ai/database'
import { AUTH_CONFIG, validateEmail } from '@/lib/auth/config'
import { signToken, createAuthCookie, createSessionCookie } from '@/lib/auth/jwt'
import { isAdminEmail, getClientIp, getUserAgent } from '@/lib/auth/security'

interface GoogleTokenResponse {
  access_token: string
  id_token: string
  token_type: string
  expires_in: number
}

interface GoogleUserInfo {
  id: string
  email: string
  verified_email: boolean
  name: string
  given_name: string
  family_name: string
  picture: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(`${AUTH_CONFIG.APP_URL}/login?error=google_denied`)
    }

    if (!code) {
      return NextResponse.redirect(`${AUTH_CONFIG.APP_URL}/login?error=no_code`)
    }

    const clientId = AUTH_CONFIG.GOOGLE_CLIENT_ID
    const clientSecret = AUTH_CONFIG.GOOGLE_CLIENT_SECRET
    const redirectUri = `${AUTH_CONFIG.APP_URL}/api/auth/google/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${AUTH_CONFIG.APP_URL}/login?error=oauth_not_configured`)
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect(`${AUTH_CONFIG.APP_URL}/login?error=token_exchange_failed`)
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json()

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userInfoResponse.ok) {
      console.error('User info fetch failed:', await userInfoResponse.text())
      return NextResponse.redirect(`${AUTH_CONFIG.APP_URL}/login?error=userinfo_failed`)
    }

    const googleUser: GoogleUserInfo = await userInfoResponse.json()

    if (!googleUser.email || !validateEmail(googleUser.email)) {
      return NextResponse.redirect(`${AUTH_CONFIG.APP_URL}/login?error=invalid_email`)
    }

    const ip = getClientIp(request.headers)
    const userAgent = getUserAgent(request.headers)

    // Check if user exists by Google ID or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: googleUser.id },
          { email: googleUser.email.toLowerCase() },
        ],
      },
    })

    if (user) {
      // Update existing user with Google ID if not set
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.id,
            avatarUrl: user.avatarUrl || googleUser.picture,
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
        })
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ip,
          lastLoginDevice: userAgent,
        },
      })
    } else {
      // Create new user
      const isAdmin = isAdminEmail(googleUser.email)

      user = await prisma.user.create({
        data: {
          email: googleUser.email.toLowerCase(),
          googleId: googleUser.id,
          fullName: googleUser.name,
          avatarUrl: googleUser.picture,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          isAdmin,
          lastLoginAt: new Date(),
          lastLoginIp: ip,
          lastLoginDevice: userAgent,
        },
      })

      // Log registration
      await prisma.loginAuditLog.create({
        data: {
          userId: user.id,
          email: user.email,
          eventType: 'REGISTER',
          ipAddress: ip,
          userAgent,
          metadata: { provider: 'google' },
        },
      })
    }

    // Log login
    await prisma.loginAuditLog.create({
      data: {
        userId: user.id,
        email: user.email,
        eventType: 'LOGIN_SUCCESS',
        ipAddress: ip,
        userAgent,
        metadata: { provider: 'google' },
      },
    })

    // Create JWT token
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.fullName || undefined,
      isAdmin: user.isAdmin,
    })

    // Redirect with cookies
    const response = NextResponse.redirect(`${AUTH_CONFIG.APP_URL}/`)
    response.headers.append('Set-Cookie', createAuthCookie(token))
    response.headers.append('Set-Cookie', createSessionCookie())

    return response
  } catch (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(`${AUTH_CONFIG.APP_URL}/login?error=oauth_error`)
  }
}
