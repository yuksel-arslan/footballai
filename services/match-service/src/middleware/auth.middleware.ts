import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token bulunamadı. Lütfen giriş yapın.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token and get user
    const user = await authService.verifyToken(token);

    // Attach user to request object
    (req as any).user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Geçersiz token',
    });
  }
};
