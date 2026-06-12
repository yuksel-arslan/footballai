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
  let code = 'INTERNAL_ERROR'

  // Known business errors thrown by the auth service must surface their real
  // message with a proper status instead of collapsing into a 500 — the user
  // has to see WHY registration/login failed.
  const m = err.message
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = m
    code = 'VALIDATION_ERROR'
  } else if (m.includes('already registered')) {
    statusCode = 409
    message = m
    code = 'EMAIL_TAKEN'
  } else if (m.includes('Invalid email or password')) {
    statusCode = 401
    message = m
    code = 'INVALID_CREDENTIALS'
  } else if (m.includes('locked')) {
    statusCode = 423
    message = m
    code = 'ACCOUNT_LOCKED'
  } else if (m.includes('Invalid or expired')) {
    statusCode = 400
    message = m
    code = 'INVALID_TOKEN'
  } else if (m.includes('not found')) {
    statusCode = 404
    message = m
    code = 'NOT_FOUND'
  } else if (m.includes('unauthorized') || m.includes('token')) {
    statusCode = 401
    message = m
    code = 'UNAUTHORIZED'
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}
