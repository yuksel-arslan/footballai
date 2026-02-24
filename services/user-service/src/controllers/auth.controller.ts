import type { Request, Response, NextFunction } from 'express'
import { authService } from '../services/auth.service'
import { registerSchema, loginSchema } from '../types/auth.types'
import { z } from 'zod'

class AuthController {
  /** POST /api/auth/register */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const input = registerSchema.parse(req.body)
      const result = await authService.register(input)

      res.status(201).json({ success: true, data: result })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, errors: error.errors })
      }
      next(error)
    }
  }

  /** POST /api/auth/login */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = loginSchema.parse(req.body)
      const result = await authService.login(email, password)

      res.json({ success: true, data: result })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, errors: error.errors })
      }
      next(error)
    }
  }

  /** POST /api/auth/logout */
  async logout(_req: Request, res: Response) {
    res.json({ success: true, message: 'Logged out' })
  }

  /** GET /api/auth/me */
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user
      res.json({ success: true, data: { user } })
    } catch (error) {
      next(error)
    }
  }
}

export const authController = new AuthController()
