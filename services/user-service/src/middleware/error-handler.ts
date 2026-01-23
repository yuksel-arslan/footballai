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
  } else if (
    err.message.includes('unauthorized') ||
    err.message.includes('Invalid token') ||
    err.message.includes('Token expired')
  ) {
    statusCode = 401
    message = err.message
  } else if (err.message.includes('already exists')) {
    statusCode = 409
    message = err.message
  } else if (err.message.includes('Invalid credentials')) {
    statusCode = 401
    message = 'Invalid email or password'
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}
