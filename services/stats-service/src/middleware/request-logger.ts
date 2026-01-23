import { Request, Response, NextFunction } from 'express'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const status = res.statusCode
    const method = req.method
    const url = req.originalUrl

    const emoji = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅'

    console.log(`${emoji} ${method} ${url} ${status} - ${duration}ms`)
  })

  next()
}
