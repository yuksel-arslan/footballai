import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@football-ai/database'
import { getTokenFromCookies, verifyToken } from '@/lib/auth/jwt'
import { verifyPassword, getClientIp, getUserAgent } from '@/lib/auth/security'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { error: 'Şifre gerekli' },
        { status: 400 }
      )
    }

    const cookieHeader = request.headers.get('cookie')
    const token = getTokenFromCookies(cookieHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Oturum bulunamadı' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Geçersiz oturum' },
        { status: 401 }
      )
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'Şifre doğrulanamadı' },
        { status: 400 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Şifre hatalı' },
        { status: 401 }
      )
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    })

    // Log event
    await prisma.loginAuditLog.create({
      data: {
        userId: user.id,
        email: user.email,
        eventType: 'TWO_FACTOR_DISABLED',
        ipAddress: getClientIp(request.headers),
        userAgent: getUserAgent(request.headers),
      },
    })

    return NextResponse.json({
      success: true,
      message: '2FA başarıyla devre dışı bırakıldı',
    })
  } catch (error) {
    console.error('2FA disable error:', error)
    return NextResponse.json(
      { error: '2FA devre dışı bırakma başarısız' },
      { status: 500 }
    )
  }
}
