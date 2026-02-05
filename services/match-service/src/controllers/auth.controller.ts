import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { registerSchema, loginSchema } from '../types/auth.types';
import { z } from 'zod';

class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate input
      const input = registerSchema.parse(req.body);

      // Register user
      const result = await authService.register(input);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Kayıt başarılı',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz veri',
          errors: error.errors,
        });
      }
      next(error);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate input
      const { email, password } = loginSchema.parse(req.body);

      // Login user
      const result = await authService.login(email, password);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Giriş başarılı',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz veri',
          errors: error.errors,
        });
      }
      next(error);
    }
  }

  /**
   * Get current user
   * GET /api/auth/me
   */
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      // User is already attached by auth middleware
      const user = (req as any).user;

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
