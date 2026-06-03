import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

interface JWTPayload {
  userId: string
  isAdmin?: boolean
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
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
      return
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload

    ;(req as any).user = { id: decoded.userId }

    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Invalid token',
    })
    return
  }
}

/**
 * Admin-only middleware. Verifies the JWT and requires the `isAdmin` claim
 * (set by user-service at token issue). Use for ops endpoints that consume
 * quota or mutate data (fixture sync/backfill, etc.).
 */
export const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
      return
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload

    if (!decoded.isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required',
      })
      return
    }

    ;(req as any).user = { id: decoded.userId, isAdmin: true }

    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Invalid token',
    })
    return
  }
}
