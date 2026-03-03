import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Error:', err)

  let statusCode = 500
  let message = 'Internal server error'
  let code = 'INTERNAL_ERROR'

  if (err.name === 'ValidationError') {
    statusCode = 400
    message = err.message
    code = 'VALIDATION_ERROR'
  } else if (err.message.includes('not found')) {
    statusCode = 404
    message = err.message
    code = 'NOT_FOUND'
  } else if (err.message.includes('unauthorized')) {
    statusCode = 401
    message = 'Unauthorized'
    code = 'UNAUTHORIZED'
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}
