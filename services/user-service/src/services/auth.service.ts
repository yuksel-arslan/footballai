import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@football-ai/database'
import type { RegisterInput, AuthResponse, JWTPayload, UserWithRelations } from '../types/auth.types'
import { config } from '../config'

const prisma = new PrismaClient()

class AuthService {
  /** Register a new user */
  async register(input: RegisterInput): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    })

    if (existingUser) {
      throw new Error('Email already registered')
    }

    const hashedPassword = await bcrypt.hash(input.password, 10)

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: hashedPassword,
        fullName: input.name,
      },
      select: { id: true, email: true, fullName: true },
    })

    const token = this.generateToken(user.id)
    return { user: { id: user.id, email: user.email, name: user.fullName || '' }, token }
  }

  /** Login user */
  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      throw new Error('Invalid email or password')
    }

    if (!user.passwordHash) {
      throw new Error('Invalid email or password')
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      throw new Error('Invalid email or password')
    }

    const token = this.generateToken(user.id)
    return {
      user: { id: user.id, email: user.email, name: user.fullName || '' },
      token,
    }
  }

  /** Verify JWT token and return user */
  async verifyToken(token: string): Promise<UserWithRelations> {
    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          favoriteTeams: { include: { team: true } },
          favoriteLeagues: { include: { league: true } },
        },
      })

      if (!user) {
        throw new Error('User not found')
      }

      const { passwordHash, ...userWithoutPassword } = user
      return userWithoutPassword
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token')
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired')
      }
      throw error
    }
  }

  /** Get user by ID */
  async getUserById(userId: string): Promise<UserWithRelations> {
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

    const { passwordHash, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  private generateToken(userId: string): string {
    return jwt.sign({ userId } as JWTPayload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn,
    })
  }
}

export const authService = new AuthService()
