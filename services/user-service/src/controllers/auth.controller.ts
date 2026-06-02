import type { Request, Response, NextFunction } from 'express'
import { authService } from '../services/auth.service'
import { registerSchema, loginSchema } from '../types/auth.types'
import {
  getClientIp,
  getUserAgent,
  validatePassword,
  checkRateLimit,
} from '../lib/security'
import { z } from 'zod'

class AuthController {
  /** POST /api/auth/register */
  async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const input = registerSchema.parse(req.body)

      const ip = getClientIp(req)
      if (!checkRateLimit(`register:${ip}`, 5, 3600000)) {
        res
          .status(429)
          .json({ success: false, error: 'Too many registration attempts' })
        return
      }

      const result = await authService.register(input)
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors })
        return
      }
      next(error)
    }
  }

  /** POST /api/auth/login */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = loginSchema.parse(req.body)
      const ip = getClientIp(req)
      const ua = getUserAgent(req)

      if (!checkRateLimit(`login:${ip}`, 10, 60000)) {
        res
          .status(429)
          .json({ success: false, error: 'Too many login attempts' })
        return
      }

      const result = await authService.login(email, password, ip, ua)

      if (result.requires2FA) {
        res.json({ success: true, requires2FA: true, userId: result.userId })
        return
      }

      res.json({ success: true, data: result })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors })
        return
      }
      next(error)
    }
  }

  /** POST /api/auth/logout */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization
      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : null
      const userId = (req as any).user?.id

      if (token) {
        await authService.logout(token, userId)
      }

      res.json({ success: true, message: 'Logged out' })
    } catch (error) {
      next(error)
    }
  }

  /** GET /api/auth/me */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user
      res.json({ success: true, data: { user } })
    } catch (error) {
      next(error)
    }
  }

  /** POST /api/auth/forgot-password */
  async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.body
      if (!email) {
        res.status(400).json({ success: false, error: 'Email is required' })
        return
      }

      const ip = getClientIp(req)
      if (!checkRateLimit(`forgot:${ip}`, 3, 3600000)) {
        res.status(429).json({ success: false, error: 'Too many requests' })
        return
      }

      const result = await authService.forgotPassword(email)
      res.json({ success: true, message: result.message })
    } catch (error) {
      next(error)
    }
  }

  /** POST /api/auth/reset-password */
  async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { token, password } = req.body
      if (!token || !password) {
        res
          .status(400)
          .json({ success: false, error: 'Token and password are required' })
        return
      }

      const validation = validatePassword(password)
      if (!validation.valid) {
        res.status(400).json({ success: false, errors: validation.errors })
        return
      }

      const result = await authService.resetPassword(token, password)
      res.json({ success: true, message: result.message })
    } catch (error) {
      next(error)
    }
  }

  /** POST /api/auth/verify-email */
  async verifyEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { token } = req.body
      if (!token) {
        res.status(400).json({ success: false, error: 'Token is required' })
        return
      }

      const result = await authService.verifyEmail(token)
      res.json({ success: true, message: result.message })
    } catch (error) {
      next(error)
    }
  }

  /** POST /api/auth/2fa/setup */
  async setup2FA(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id
      const result = await authService.setup2FA(userId)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  /** POST /api/auth/2fa/enable */
  async enable2FA(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id
      const { code } = req.body
      if (!code) {
        res.status(400).json({ success: false, error: '2FA code is required' })
        return
      }

      const result = await authService.enable2FA(userId, code)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  /** POST /api/auth/2fa/disable */
  async disable2FA(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id
      const { password } = req.body
      if (!password) {
        res.status(400).json({ success: false, error: 'Password is required' })
        return
      }

      const result = await authService.disable2FA(userId, password)
      res.json({ success: true, message: result.message })
    } catch (error) {
      next(error)
    }
  }

  /** POST /api/auth/2fa/verify */
  async verify2FA(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId, code } = req.body
      if (!userId || !code) {
        res
          .status(400)
          .json({ success: false, error: 'userId and code are required' })
        return
      }

      const ip = getClientIp(req)
      const ua = getUserAgent(req)
      const result = await authService.verify2FA(userId, code, ip, ua)

      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  /** GET /api/auth/google */
  async googleAuth(_req: Request, res: Response): Promise<void> {
    const url = authService.getGoogleAuthUrl()
    res.redirect(url)
  }

  /** GET /api/auth/google/callback */
  async googleCallback(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { code } = req.query
      if (!code || typeof code !== 'string') {
        res
          .status(400)
          .json({ success: false, error: 'Authorization code required' })
        return
      }

      const ip = getClientIp(req)
      const ua = getUserAgent(req)
      const result = await authService.handleGoogleCallback(code, ip, ua)

      // Return token + user as JSON; the web callback route sets the auth cookie
      // and redirects the browser. (Redirecting here lands on a non-existent
      // /auth/callback page and never sets the cookie on the frontend domain.)
      res.json({ success: true, token: result.token, user: result.user })
    } catch (error) {
      next(error)
    }
  }
}

export const authController = new AuthController()
