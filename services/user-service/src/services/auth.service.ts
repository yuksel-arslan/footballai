import jwt from 'jsonwebtoken'
import { PrismaClient } from '@football-ai/database'
import type { RegisterInput, AuthResponse } from '../types/auth.types'
import { config } from '../config'
import { logger } from '../lib/logger'
import {
  hashPassword,
  verifyPassword,
  hashToken,
  createEmailVerificationToken,
  createPasswordResetToken,
  isAccountLocked,
  calculateLockoutTime,
  shouldLockAccount,
  generate2FASecret,
  generateQRCode,
  verify2FACode,
  generateBackupCodes,
  verifyBackupCode,
  isAdminEmail,
} from '../lib/security'

const prisma = new PrismaClient()

class AuthService {
  // ============================================
  // REGISTER
  // ============================================

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    })

    if (existingUser) {
      throw new Error('Email already registered')
    }

    const hashedPw = await hashPassword(input.password)
    const { hashedToken: verificationToken, expires: verificationExpires } =
      createEmailVerificationToken()

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: hashedPw,
        fullName: input.name,
        isAdmin: isAdminEmail(input.email),
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        isAdmin: true,
        emailVerified: true,
        twoFactorEnabled: true,
      },
    })

    await this.logAuditEvent(user.id, user.email, 'REGISTER')

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    })

    return {
      user: { id: user.id, email: user.email, name: user.fullName || '' },
      token,
    }
  }

  // ============================================
  // LOGIN
  // ============================================

  async login(
    email: string,
    password: string,
    ip?: string,
    userAgent?: string
  ): Promise<AuthResponse & { requires2FA?: boolean; userId?: string }> {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      throw new Error('Invalid email or password')
    }

    // Check account lockout
    if (user.accountLocked && isAccountLocked(user.accountLockedUntil)) {
      await this.logAuditEvent(
        user.id,
        email,
        'LOGIN_FAILED',
        'Account locked',
        ip,
        userAgent
      )
      throw new Error('Account is locked. Please try again later.')
    }

    // Unlock if lockout period expired
    if (user.accountLocked && !isAccountLocked(user.accountLockedUntil)) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          accountLocked: false,
          accountLockedUntil: null,
          loginAttempts: 0,
        },
      })
    }

    if (!user.passwordHash) {
      throw new Error('Invalid email or password')
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash)
    if (!isPasswordValid) {
      const attempts = user.loginAttempts + 1

      if (shouldLockAccount(attempts)) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: attempts,
            accountLocked: true,
            accountLockedUntil: calculateLockoutTime(),
          },
        })
        await this.logAuditEvent(
          user.id,
          email,
          'ACCOUNT_LOCKED',
          `Locked after ${attempts} failed attempts`,
          ip,
          userAgent
        )
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { loginAttempts: attempts },
        })
      }

      await this.logAuditEvent(
        user.id,
        email,
        'LOGIN_FAILED',
        'Invalid password',
        ip,
        userAgent
      )
      throw new Error('Invalid email or password')
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      return {
        user: { id: user.id, email: user.email, name: user.fullName || '' },
        token: '',
        requires2FA: true,
        userId: user.id,
      }
    }

    // Reset login attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lastLoginAt: new Date(),
        lastLoginIp: ip || null,
        lastLoginDevice: userAgent || null,
      },
    })

    await this.logAuditEvent(
      user.id,
      email,
      'LOGIN_SUCCESS',
      undefined,
      ip,
      userAgent
    )

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    })

    return {
      user: { id: user.id, email: user.email, name: user.fullName || '' },
      token,
    }
  }

  // ============================================
  // LOGOUT
  // ============================================

  async logout(token: string, userId?: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as any
      const expiresAt = decoded?.exp
        ? new Date(decoded.exp * 1000)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      await prisma.tokenBlacklist.create({
        data: {
          token,
          userId: userId || null,
          reason: 'logout',
          expiresAt,
        },
      })

      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        })
        if (user) {
          await this.logAuditEvent(userId, user.email, 'LOGOUT')
        }
      }
    } catch {
      // Logout should not fail even if token blacklisting fails
    }
  }

  // ============================================
  // VERIFY TOKEN
  // ============================================

  async verifyToken(token: string) {
    const decoded = jwt.verify(token, config.auth.jwtSecret) as any

    // Check blacklist
    const blacklisted = await prisma.tokenBlacklist.findUnique({
      where: { token },
    })
    if (blacklisted) {
      throw new Error('Token has been revoked')
    }

    const userId = decoded.userId || decoded.id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        favoriteTeams: { include: { team: true } },
        favoriteLeagues: { include: { league: true } },
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const {
      passwordHash,
      twoFactorSecret,
      twoFactorBackupCodes,
      passwordResetToken,
      emailVerificationToken,
      ...safe
    } = user
    return safe
  }

  // ============================================
  // GET USER BY ID
  // ============================================

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        favoriteTeams: { include: { team: true } },
        favoriteLeagues: { include: { league: true } },
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const {
      passwordHash,
      twoFactorSecret,
      twoFactorBackupCodes,
      passwordResetToken,
      emailVerificationToken,
      ...safe
    } = user
    return safe
  }

  // ============================================
  // FORGOT PASSWORD
  // ============================================

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return { message: 'If the email exists, a reset link has been sent.' }
    }

    const { hashedToken, expires } = createPasswordResetToken()

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expires,
      },
    })

    await this.logAuditEvent(user.id, email, 'PASSWORD_RESET_REQUEST')

    // TODO: Send email with reset link
    return { message: 'If the email exists, a reset link has been sent.' }
  }

  // ============================================
  // RESET PASSWORD
  // ============================================

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const hashedInputToken = hashToken(token)

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedInputToken,
        passwordResetExpires: { gt: new Date() },
      },
    })

    if (!user) {
      throw new Error('Invalid or expired reset token')
    }

    const hashedPw = await hashPassword(newPassword)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPw,
        passwordResetToken: null,
        passwordResetExpires: null,
        loginAttempts: 0,
        accountLocked: false,
        accountLockedUntil: null,
      },
    })

    await this.logAuditEvent(user.id, user.email, 'PASSWORD_RESET_SUCCESS')

    return { message: 'Password has been reset successfully.' }
  }

  // ============================================
  // EMAIL VERIFICATION
  // ============================================

  async verifyEmail(token: string): Promise<{ message: string }> {
    const hashedInputToken = hashToken(token)

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: hashedInputToken,
        emailVerificationExpires: { gt: new Date() },
      },
    })

    if (!user) {
      throw new Error('Invalid or expired verification token')
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    })

    await this.logAuditEvent(user.id, user.email, 'EMAIL_VERIFICATION')

    return { message: 'Email verified successfully.' }
  }

  // ============================================
  // 2FA SETUP
  // ============================================

  async setup2FA(userId: string): Promise<{ qrCode: string; secret: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    })

    if (!user) throw new Error('User not found')
    if (user.twoFactorEnabled) throw new Error('2FA is already enabled')

    const { secret, otpauthUrl } = generate2FASecret(user.email)
    const qrCode = await generateQRCode(otpauthUrl)

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    })

    return { qrCode, secret }
  }

  // ============================================
  // 2FA ENABLE
  // ============================================

  async enable2FA(
    userId: string,
    code: string
  ): Promise<{ backupCodes: string[] }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorSecret: true, twoFactorEnabled: true },
    })

    if (!user) throw new Error('User not found')
    if (user.twoFactorEnabled) throw new Error('2FA is already enabled')
    if (!user.twoFactorSecret) throw new Error('2FA setup not initiated')

    const isValid = verify2FACode(user.twoFactorSecret, code)
    if (!isValid) throw new Error('Invalid 2FA code')

    const { codes, hashedCodes } = generateBackupCodes()

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedCodes,
      },
    })

    await this.logAuditEvent(userId, user.email, 'TWO_FACTOR_ENABLED')

    return { backupCodes: codes }
  }

  // ============================================
  // 2FA DISABLE
  // ============================================

  async disable2FA(
    userId: string,
    password: string
  ): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, passwordHash: true, twoFactorEnabled: true },
    })

    if (!user) throw new Error('User not found')
    if (!user.twoFactorEnabled) throw new Error('2FA is not enabled')
    if (!user.passwordHash) throw new Error('Password required')

    const isPasswordValid = await verifyPassword(password, user.passwordHash)
    if (!isPasswordValid) throw new Error('Invalid password')

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    })

    await this.logAuditEvent(userId, user.email, 'TWO_FACTOR_DISABLED')

    return { message: '2FA has been disabled.' }
  }

  // ============================================
  // 2FA VERIFY (during login)
  // ============================================

  async verify2FA(
    userId: string,
    code: string,
    ip?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        isAdmin: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
        twoFactorEnabled: true,
      },
    })

    if (!user) throw new Error('User not found')
    if (!user.twoFactorEnabled || !user.twoFactorSecret)
      throw new Error('2FA is not enabled')

    let isValid = verify2FACode(user.twoFactorSecret, code)

    if (!isValid) {
      const backupResult = verifyBackupCode(code, user.twoFactorBackupCodes)
      if (backupResult.valid) {
        isValid = true
        await prisma.user.update({
          where: { id: userId },
          data: { twoFactorBackupCodes: backupResult.remainingCodes },
        })
      }
    }

    if (!isValid) {
      throw new Error('Invalid 2FA code')
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: 0,
        lastLoginAt: new Date(),
        lastLoginIp: ip || null,
        lastLoginDevice: userAgent || null,
      },
    })

    await this.logAuditEvent(
      userId,
      user.email,
      'TWO_FACTOR_VERIFIED',
      undefined,
      ip,
      userAgent
    )

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    })

    return {
      user: { id: user.id, email: user.email, name: user.fullName || '' },
      token,
    }
  }

  // ============================================
  // GOOGLE OAUTH
  // ============================================

  getGoogleAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: config.google.clientId,
      redirect_uri: `${config.appUrl}/api/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  async handleGoogleCallback(
    code: string,
    ip?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: `${config.appUrl}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      throw new Error('Failed to exchange Google auth code')
    }

    const tokens = (await tokenRes.json()) as { access_token: string }

    const userInfoRes = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    )

    if (!userInfoRes.ok) {
      throw new Error('Failed to get Google user info')
    }

    const googleUser = (await userInfoRes.json()) as {
      id: string
      email: string
      name?: string
      picture?: string
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleUser.id }, { email: googleUser.email }],
      },
    })

    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.id,
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
        })
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ip || null,
          lastLoginDevice: userAgent || null,
        },
      })

      await this.logAuditEvent(
        user.id,
        user.email,
        'LOGIN_SUCCESS',
        'Google OAuth',
        ip,
        userAgent
      )
    } else {
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          fullName: googleUser.name || null,
          avatarUrl: googleUser.picture || null,
          googleId: googleUser.id,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          isAdmin: isAdminEmail(googleUser.email),
          lastLoginAt: new Date(),
          lastLoginIp: ip || null,
          lastLoginDevice: userAgent || null,
        },
      })

      await this.logAuditEvent(
        user.id,
        user.email,
        'REGISTER',
        'Google OAuth',
        ip,
        userAgent
      )
    }

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    })

    return {
      user: { id: user.id, email: user.email, name: user.fullName || '' },
      token,
    }
  }

  // ============================================
  // AUDIT LOGGING
  // ============================================

  private async logAuditEvent(
    userId: string,
    email: string,
    eventType: string,
    failureReason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await prisma.loginAuditLog.create({
        data: {
          userId,
          email,
          eventType: eventType as any,
          failureReason: failureReason || null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      })
    } catch {
      logger.error(
        { eventType, email },
        `Failed to log audit event: ${eventType} for ${email}`
      )
    }
  }

  // ============================================
  // TOKEN GENERATION
  // ============================================

  private generateToken(payload: {
    id: string
    email: string
    isAdmin: boolean
  }): string {
    const expiresIn = config.auth.jwtExpiresIn
    return jwt.sign(
      {
        userId: payload.id,
        id: payload.id,
        email: payload.email,
        isAdmin: payload.isAdmin,
      } as jwt.JwtPayload,
      config.auth.jwtSecret,
      { expiresIn } as jwt.SignOptions
    )
  }
}

export const authService = new AuthService()
