import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@football-ai/database'
import { hashToken, getClientIp, getUserAgent } from '@/lib/auth/security'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token gerekli' },
        { status: 400 }
      )
    }

    // Hash the token to compare with stored hash
    const hashedToken = hashToken(token)

    // Find user with this token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Geçersiz veya süresi dolmuş doğrulama bağlantısı' },
        { status: 400 }
      )
    }

    // Verify email
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    })

    // Log event
    await prisma.loginAuditLog.create({
      data: {
        userId: user.id,
        email: user.email,
        eventType: 'EMAIL_VERIFICATION',
        ipAddress: getClientIp(request.headers),
        userAgent: getUserAgent(request.headers),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Email adresiniz başarıyla doğrulandı!',
    })
  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.json(
      { error: 'Email doğrulama başarısız' },
      { status: 500 }
    )
  }
}
