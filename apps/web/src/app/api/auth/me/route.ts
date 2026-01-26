import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@football-ai/database'
import { getTokenFromCookies, verifyToken } from '@/lib/auth/jwt'
import { hashToken } from '@/lib/auth/security'

export async function GET(request: NextRequest) {
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

    // Check if token is blacklisted
    const blacklisted = await prisma.tokenBlacklist.findUnique({
      where: { token: hashToken(token) },
    })

    if (blacklisted) {
      return NextResponse.json(
        { error: 'Oturum sonlandırılmış' },
        { status: 401 }
      )
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        isAdmin: true,
        emailVerified: true,
        twoFactorEnabled: true,
        preferredLang: true,
        theme: true,
        createdAt: true,
        lastLoginAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Kullanıcı bilgileri alınamadı' },
      { status: 500 }
    )
  }
}
