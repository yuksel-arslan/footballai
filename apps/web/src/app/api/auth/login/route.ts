import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@football-ai/database'
import {
  verifyPassword,
  isAccountLocked,
  shouldLockAccount,
  calculateLockoutTime,
  getClientIp,
  getUserAgent,
  checkRateLimit,
} from '@/lib/auth/security'
import { signToken, createAuthCookie, createSessionCookie } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email ve şifre gerekli' },
        { status: 400 }
      )
    }

    const ip = getClientIp(request.headers)
    const userAgent = getUserAgent(request.headers)

    // Rate limiting
    if (!checkRateLimit(`login:${ip}`, 10, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Çok fazla giriş denemesi. Lütfen bir dakika bekleyin.' },
        { status: 429 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user || !user.passwordHash) {
      // Log failed attempt
      await prisma.loginAuditLog.create({
        data: {
          email: email.toLowerCase(),
          eventType: 'LOGIN_FAILED',
          ipAddress: ip,
          userAgent,
          failureReason: 'Kullanıcı bulunamadı',
        },
      })

      return NextResponse.json(
        { error: 'Email veya şifre hatalı' },
        { status: 401 }
      )
    }

    // Check if account is locked
    if (isAccountLocked(user.accountLockedUntil)) {
      return NextResponse.json(
        { error: 'Hesabınız geçici olarak kilitlendi. Lütfen daha sonra tekrar deneyin.' },
        { status: 423 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)

    if (!isValidPassword) {
      // Increment failed attempts
      const newAttempts = user.loginAttempts + 1

      // Check if should lock
      if (shouldLockAccount(newAttempts)) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: newAttempts,
            accountLocked: true,
            accountLockedUntil: calculateLockoutTime(),
          },
        })

        await prisma.loginAuditLog.create({
          data: {
            userId: user.id,
            email: user.email,
            eventType: 'ACCOUNT_LOCKED',
            ipAddress: ip,
            userAgent,
            failureReason: 'Çok fazla başarısız giriş denemesi',
          },
        })

        return NextResponse.json(
          { error: 'Çok fazla başarısız deneme. Hesabınız 30 dakika kilitlendi.' },
          { status: 423 }
        )
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: newAttempts },
      })

      await prisma.loginAuditLog.create({
        data: {
          userId: user.id,
          email: user.email,
          eventType: 'LOGIN_FAILED',
          ipAddress: ip,
          userAgent,
          failureReason: 'Yanlış şifre',
        },
      })

      return NextResponse.json(
        { error: 'Email veya şifre hatalı' },
        { status: 401 }
      )
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Return special response for 2FA
      return NextResponse.json({
        requires2FA: true,
        userId: user.id,
        message: 'İki faktörlü doğrulama gerekli',
      })
    }

    // Check email verification (optional - can be enforced)
    // if (!user.emailVerified) {
    //   return NextResponse.json(
    //     { error: 'Lütfen email adresinizi doğrulayın' },
    //     { status: 403 }
    //   )
    // }

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

    // Log successful login
    await prisma.loginAuditLog.create({
      data: {
        userId: user.id,
        email: user.email,
        eventType: 'LOGIN_SUCCESS',
        ipAddress: ip,
        userAgent,
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
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Giriş sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}
