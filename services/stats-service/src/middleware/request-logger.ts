import { Request, Response, NextFunction } from 'express'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const status = res.statusCode
    console.log(`${req.method} ${req.originalUrl} ${status} - ${duration}ms`)
  })

  next()
}
