import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[Gateway] Error:', err.message)

  res.status(502).json({
    success: false,
    error:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Service unavailable',
    code: 'SERVICE_UNAVAILABLE',
  })
}
