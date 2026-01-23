import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('❌ Error:', err)

  // Default error
  let statusCode = 500
  let message = 'Internal server error'

  // Custom error handling
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = err.message
  } else if (err.message.includes('not found')) {
    statusCode = 404
    message = err.message
  } else if (err.message.includes('unauthorized')) {
    statusCode = 401
    message = 'Unauthorized'
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}
