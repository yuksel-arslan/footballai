import { Request, Response } from 'express'
import { z } from 'zod'
import { authService } from '@/services/auth-service'

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

export class AuthController {
  // POST /api/auth/register
  async register(req: Request, res: Response) {
    const validation = registerSchema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      })
    }

    const result = await authService.register(validation.data)

    res.status(201).json({
      message: 'Registration successful',
      ...result,
    })
  }

  // POST /api/auth/login
  async login(req: Request, res: Response) {
    const validation = loginSchema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      })
    }

    const result = await authService.login(validation.data)

    res.json({
      message: 'Login successful',
      ...result,
    })
  }

  // POST /api/auth/refresh
  async refresh(req: Request, res: Response) {
    const validation = refreshSchema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      })
    }

    const tokens = await authService.refreshToken(validation.data.refreshToken)

    res.json({
      message: 'Token refreshed successfully',
      ...tokens,
    })
  }

  // POST /api/auth/change-password (requires auth)
  async changePassword(req: Request, res: Response) {
    const validation = changePasswordSchema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      })
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await authService.changePassword(
      req.user.userId,
      validation.data.currentPassword,
      validation.data.newPassword
    )

    res.json(result)
  }

  // GET /api/auth/me (requires auth)
  async me(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    res.json({
      userId: req.user.userId,
      email: req.user.email,
    })
  }
}

export const authController = new AuthController()
