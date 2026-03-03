import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error({ err }, err.message)

  let statusCode = 500
  let message = 'Internal server error'

  if (err.name === 'ValidationError') {
    statusCode = 400
    message = err.message
  } else if (err.message.includes('not found')) {
    statusCode = 404
    message = err.message
  }

  const code =
    statusCode === 400
      ? 'VALIDATION_ERROR'
      : statusCode === 404
        ? 'NOT_FOUND'
        : 'INTERNAL_ERROR'

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}
