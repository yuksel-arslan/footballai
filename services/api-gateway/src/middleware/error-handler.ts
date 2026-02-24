import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[Gateway] Error:', err.message)

  res.status(502).json({
    error: 'Service unavailable',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Please try again later',
  })
}
