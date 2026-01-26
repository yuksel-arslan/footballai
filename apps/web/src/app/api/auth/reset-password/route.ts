import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@football-ai/database'
import { hashPassword, hashToken, getClientIp, getUserAgent } from '@/lib/auth/security'
import { validatePassword, AUTH_CONFIG } from '@/lib/auth/config'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token ve yeni şifre gerekli' },
        { status: 400 }
      )
    }

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors.join(', ') },
        { status: 400 }
      )
    }

    // Hash the token to compare with stored hash
    const hashedToken = hashToken(token)

    // Find user with this token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Geçersiz veya süresi dolmuş token' },
        { status: 400 }
      )
    }

    // Hash new password
    const passwordHash = await hashPassword(password)

    // Update user and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        loginAttempts: 0,
        accountLocked: false,
        accountLockedUntil: null,
      },
    })

    // Blacklist all existing tokens for this user
    await prisma.tokenBlacklist.create({
      data: {
        token: `all-tokens-${user.id}-${Date.now()}`,
        userId: user.id,
        reason: 'Password reset',
        expiresAt: new Date(Date.now() + AUTH_CONFIG.COOKIE_MAX_AGE * 1000),
      },
    })

    // Log event
    await prisma.loginAuditLog.create({
      data: {
        userId: user.id,
        email: user.email,
        eventType: 'PASSWORD_RESET_SUCCESS',
        ipAddress: getClientIp(request.headers),
        userAgent: getUserAgent(request.headers),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Şifreniz başarıyla sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Şifre sıfırlama başarısız' },
      { status: 500 }
    )
  }
}
