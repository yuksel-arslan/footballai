import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@football-ai/database'
import {
  hashPassword,
  createEmailVerificationToken,
  isAdminEmail,
  getClientIp,
  getUserAgent,
  checkRateLimit,
} from '@/lib/auth/security'
import { signToken, createAuthCookie, createSessionCookie } from '@/lib/auth/jwt'
import { validatePassword, validateEmail } from '@/lib/auth/config'

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email ve şifre gerekli' },
        { status: 400 }
      )
    }

    // Validate email
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Geçersiz email formatı' },
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

    // Rate limiting
    const ip = getClientIp(request.headers)
    if (!checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin.' },
        { status: 429 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu email adresi zaten kayıtlı' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create email verification token
    const { hashedToken, expires } = createEmailVerificationToken()

    // Determine if admin
    const isAdmin = isAdminEmail(email)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        fullName: fullName || null,
        isAdmin,
        emailVerificationToken: hashedToken,
        emailVerificationExpires: expires,
      },
    })

    // Log registration
    await prisma.loginAuditLog.create({
      data: {
        userId: user.id,
        email: user.email,
        eventType: 'REGISTER',
        ipAddress: ip,
        userAgent: getUserAgent(request.headers),
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
      },
      message: 'Kayıt başarılı! Email adresinizi doğrulayın.',
    })

    response.headers.append('Set-Cookie', createAuthCookie(token))
    response.headers.append('Set-Cookie', createSessionCookie())

    return response
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Kayıt sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}
