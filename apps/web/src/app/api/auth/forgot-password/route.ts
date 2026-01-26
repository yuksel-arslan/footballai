import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@football-ai/database'
import { createPasswordResetToken, getClientIp, getUserAgent, checkRateLimit } from '@/lib/auth/security'
import { AUTH_CONFIG } from '@/lib/auth/config'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email gerekli' },
        { status: 400 }
      )
    }

    const ip = getClientIp(request.headers)

    // Rate limiting
    if (!checkRateLimit(`password-reset:${ip}`, AUTH_CONFIG.MAX_PASSWORD_RESET_REQUESTS_PER_HOUR, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Çok fazla şifre sıfırlama isteği. Lütfen daha sonra tekrar deneyin.' },
        { status: 429 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'Eğer bu email kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.',
      })
    }

    // Create reset token
    const { token, hashedToken, expires } = createPasswordResetToken()

    // Store token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expires,
      },
    })

    // Log event
    await prisma.loginAuditLog.create({
      data: {
        userId: user.id,
        email: user.email,
        eventType: 'PASSWORD_RESET_REQUEST',
        ipAddress: ip,
        userAgent: getUserAgent(request.headers),
      },
    })

    // TODO: Send email with reset link
    // const resetUrl = `${AUTH_CONFIG.APP_URL}/reset-password?token=${token}`
    // await sendEmail(user.email, 'Şifre Sıfırlama', `Şifrenizi sıfırlamak için: ${resetUrl}`)

    console.log(`Password reset token for ${email}: ${token}`)

    return NextResponse.json({
      success: true,
      message: 'Eğer bu email kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.',
      // Development only - remove in production
      ...(process.env.NODE_ENV === 'development' && { token }),
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Şifre sıfırlama isteği başarısız' },
      { status: 500 }
    )
  }
}
