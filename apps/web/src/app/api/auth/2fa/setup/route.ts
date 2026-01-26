import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@football-ai/database'
import { getTokenFromCookies, verifyToken } from '@/lib/auth/jwt'
import { generate2FASecret, generateQRCode } from '@/lib/auth/security'

export async function POST(request: NextRequest) {
  try {
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

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA zaten aktif' },
        { status: 400 }
      )
    }

    // Generate 2FA secret
    const { secret, otpauthUrl } = generate2FASecret(user.email)

    // Generate QR code
    const qrCode = await generateQRCode(otpauthUrl)

    // Store secret temporarily (will be confirmed when enabled)
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret },
    })

    return NextResponse.json({
      success: true,
      qrCode,
      secret, // For manual entry
      message: 'QR kodunu tarayın ve ardından doğrulama kodunu girin',
    })
  } catch (error) {
    console.error('2FA setup error:', error)
    return NextResponse.json(
      { error: '2FA kurulumu başarısız' },
      { status: 500 }
    )
  }
}
