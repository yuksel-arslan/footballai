import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@football-ai/database'
import { signToken, createAuthCookie, createSessionCookie } from '@/lib/auth/jwt'
import { verify2FACode, verifyBackupCode, getClientIp, getUserAgent } from '@/lib/auth/security'

export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json()

    if (!userId || !code) {
      return NextResponse.json(
        { error: 'Kullanıcı ID ve doğrulama kodu gerekli' },
        { status: 400 }
      )
    }

    const ip = getClientIp(request.headers)
    const userAgent = getUserAgent(request.headers)

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA aktif değil' },
        { status: 400 }
      )
    }

    // Try TOTP first
    let isValid = verify2FACode(user.twoFactorSecret, code)

    // If TOTP fails, try backup code
    if (!isValid) {
      const backupResult = verifyBackupCode(code, user.twoFactorBackupCodes)

      if (backupResult.valid) {
        isValid = true

        // Update remaining backup codes
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorBackupCodes: backupResult.remainingCodes },
        })
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Geçersiz doğrulama kodu' },
        { status: 401 }
      )
    }

    // Reset failed attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        accountLocked: false,
        accountLockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        lastLoginDevice: userAgent,
      },
    })

    // Log 2FA verification
    await prisma.loginAuditLog.create({
      data: {
        userId: user.id,
        email: user.email,
        eventType: 'TWO_FACTOR_VERIFIED',
        ipAddress: ip,
        userAgent,
      },
    })

    // Log successful login
    await prisma.loginAuditLog.create({
      data: {
        userId: user.id,
        email: user.email,
        eventType: 'LOGIN_SUCCESS',
        ipAddress: ip,
        userAgent,
        metadata: { via2FA: true },
      },
    })

    // Create JWT token
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.fullName || undefined,
      isAdmin: user.isAdmin,
    })

    // Create response with cookies
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isAdmin: user.isAdmin,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    })

    response.headers.append('Set-Cookie', createAuthCookie(token))
    response.headers.append('Set-Cookie', createSessionCookie())

    return response
  } catch (error) {
    console.error('2FA verify error:', error)
    return NextResponse.json(
      { error: '2FA doğrulama başarısız' },
      { status: 500 }
    )
  }
}
