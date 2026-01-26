import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@football-ai/database'
import { getTokenFromCookies, verifyToken, clearAuthCookies } from '@/lib/auth/jwt'
import { getClientIp, getUserAgent, hashToken } from '@/lib/auth/security'
import { AUTH_CONFIG } from '@/lib/auth/config'

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie')
    const token = getTokenFromCookies(cookieHeader)

    if (token) {
      const payload = verifyToken(token)

      if (payload) {
        // Add token to blacklist
        await prisma.tokenBlacklist.create({
          data: {
            token: hashToken(token),
            userId: payload.id,
            reason: 'Logout',
            expiresAt: new Date(Date.now() + AUTH_CONFIG.COOKIE_MAX_AGE * 1000),
          },
        })

        // Log logout
        await prisma.loginAuditLog.create({
          data: {
            userId: payload.id,
            email: payload.email,
            eventType: 'LOGOUT',
            ipAddress: getClientIp(request.headers),
            userAgent: getUserAgent(request.headers),
          },
        })
      }
    }

    // Clear cookies
    const response = NextResponse.json({ success: true })

    for (const cookie of clearAuthCookies()) {
      response.headers.append('Set-Cookie', cookie)
    }

    return response
  } catch (error) {
    console.error('Logout error:', error)

    // Still clear cookies even if there's an error
    const response = NextResponse.json({ success: true })

    for (const cookie of clearAuthCookies()) {
      response.headers.append('Set-Cookie', cookie)
    }

    return response
  }
}
