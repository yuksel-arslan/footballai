import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@football-ai/database';
import type { RegisterInput, AuthResponse, JWTPayload, UserWithRelations } from '../types/auth.types';
import { config } from '../config';

const prisma = new PrismaClient();

class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new Error('Bu email adresi zaten kayıtlı');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // Generate JWT token
    const token = this.generateToken(user.id);

    return {
      user,
      token,
    };
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Email veya şifre hatalı');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Email veya şifre hatalı');
    }

    // Generate JWT token
    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<UserWithRelations> {
    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          favoriteTeams: {
            include: {
              team: true,
            },
          },
          favoriteLeagues: {
            include: {
              league: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      return userWithoutPassword;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Geçersiz token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token süresi dolmuş');
      }
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserWithRelations> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        favoriteTeams: {
          include: {
            team: true,
          },
        },
        favoriteLeagues: {
          include: {
            league: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string): string {
    const payload: JWTPayload = { userId };

    return jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn,
    });
  }
}

export const authService = new AuthService();
