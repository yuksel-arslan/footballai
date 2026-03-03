import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const status = res.statusCode

    const logData = {
      method: req.method,
      url: req.originalUrl,
      status,
      duration,
    }

    if (status >= 500) {
      logger.error(
        logData,
        `${req.method} ${req.originalUrl} ${status} - ${duration}ms`
      )
    } else if (status >= 400) {
      logger.warn(
        logData,
        `${req.method} ${req.originalUrl} ${status} - ${duration}ms`
      )
    } else {
      logger.info(
        logData,
        `${req.method} ${req.originalUrl} ${status} - ${duration}ms`
      )
    }
  })

  next()
}
