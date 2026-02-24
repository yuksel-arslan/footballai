import type { Request, Response, NextFunction } from 'express'
import { authService } from '../services/auth.service'

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
    const user = await authService.verifyToken(token)
    ;(req as any).user = user

    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Invalid token',
    })
    return
  }
}
