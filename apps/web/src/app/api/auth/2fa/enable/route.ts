import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@football-ai/database'
import { getTokenFromCookies, verifyToken } from '@/lib/auth/jwt'
import { verify2FACode, generateBackupCodes, getClientIp, getUserAgent } from '@/lib/auth/security'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Doğrulama kodu gerekli' },
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

    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: 'Önce 2FA kurulumunu yapın' },
        { status: 400 }
      )
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA zaten aktif' },
        { status: 400 }
      )
    }

    // Verify code
    const isValid = verify2FACode(user.twoFactorSecret, code)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Geçersiz doğrulama kodu' },
        { status: 400 }
      )
    }

    // Generate backup codes
    const { codes, hashedCodes } = generateBackupCodes()

    // Enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedCodes,
      },
    })

    // Log event
    await prisma.loginAuditLog.create({
      data: {
        userId: user.id,
        email: user.email,
        eventType: 'TWO_FACTOR_ENABLED',
        ipAddress: getClientIp(request.headers),
        userAgent: getUserAgent(request.headers),
      },
    })

    return NextResponse.json({
      success: true,
      backupCodes: codes,
      message: '2FA başarıyla etkinleştirildi. Yedek kodlarınızı güvenli bir yere kaydedin!',
    })
  } catch (error) {
    console.error('2FA enable error:', error)
    return NextResponse.json(
      { error: '2FA etkinleştirme başarısız' },
      { status: 500 }
    )
  }
}
