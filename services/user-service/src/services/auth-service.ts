import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@football-ai/database'
import { config } from '@/config'

const prisma = new PrismaClient()

export interface TokenPayload {
  userId: string
  email: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface RegisterInput {
  email: string
  password: string
  fullName?: string
}

export interface LoginInput {
  email: string
  password: string
}

class AuthService {
  // Register a new user
  async register(input: RegisterInput) {
    const { email, password, fullName } = input

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        createdAt: true,
      },
    })

    // Generate tokens
    const tokens = this.generateTokens({ userId: user.id, email: user.email })

    return {
      user,
      ...tokens,
    }
  }

  // Login user
  async login(input: LoginInput) {
    const { email, password } = input

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)

    if (!isValidPassword) {
      throw new Error('Invalid credentials')
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    // Generate tokens
    const tokens = this.generateTokens({ userId: user.id, email: user.email })

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    }
  }

  // Refresh access token
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.verifyRefreshToken(refreshToken)

      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true },
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Generate new tokens
      return this.generateTokens({ userId: user.id, email: user.email })
    } catch {
      throw new Error('Invalid refresh token')
    }
  }

  // Generate access and refresh tokens
  generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessTokenExpiry,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    })

    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshTokenExpiry,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    })

    return { accessToken, refreshToken }
  }

  // Verify access token
  verifyAccessToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      }) as TokenPayload

      return payload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired')
      }
      throw new Error('Invalid token')
    }
  }

  // Verify refresh token
  verifyRefreshToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, config.jwt.refreshSecret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      }) as TokenPayload

      return payload
    } catch {
      throw new Error('Invalid refresh token')
    }
  }

  // Change password
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) {
      throw new Error('Current password is incorrect')
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long')
    }

    // Hash and update password
    const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds)

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })

    return { message: 'Password changed successfully' }
  }
}

export const authService = new AuthService()
