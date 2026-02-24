import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

interface JWTPayload {
  userId: string
  iat?: number
  exp?: number
}

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 * Auth operations (login, register, etc.) are handled by user-service
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload

    ;(req as any).user = { id: decoded.userId }

    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Invalid token',
    })
  }
}
