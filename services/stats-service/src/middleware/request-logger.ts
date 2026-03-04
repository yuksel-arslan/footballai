import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const status = res.statusCode
    logger.info(
      { method: req.method, url: req.originalUrl, status, duration },
      `${req.method} ${req.originalUrl} ${status} - ${duration}ms`
    )
  })

  next()
}
