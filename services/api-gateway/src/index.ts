import express, { type Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { config } from './config/services'
import { requestLogger } from './middleware/logger'
import { errorHandler } from './middleware/error-handler'
import { generalLimiter } from './middleware/rate-limiter'
import proxyRouter from './routes/proxy'

const app: Application = express()

// CORS
const allowedOrigins = [
  'https://footballai.io',
  'https://www.footballai.io',
  process.env.FRONTEND_URL,
  ...(config.nodeEnv === 'development' ? ['http://localhost:3000'] : []),
].filter(Boolean) as string[]

// Middleware
app.use(helmet())
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)
app.use(compression())
app.use(requestLogger)
app.use(generalLimiter)

// Proxy routes
app.use(proxyRouter)

// Health check — gateway + downstream services
app.get('/health', async (_req, res) => {
  const startTime = process.uptime()

  // Check downstream services
  const checks: Record<string, string> = {}
  const serviceUrls: Record<string, string> = {
    'match-service': `${process.env.MATCH_SERVICE_URL || 'http://localhost:3001'}/health`,
    'stats-service': `${process.env.STATS_SERVICE_URL || 'http://localhost:3002'}/health`,
    'user-service': `${process.env.USER_SERVICE_URL || 'http://localhost:3003'}/health`,
    'ml-service': `${process.env.ML_SERVICE_URL || 'http://localhost:8000'}/health`,
  }

  await Promise.all(
    Object.entries(serviceUrls).map(async ([name, url]) => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 3000)
        const resp = await fetch(url, { signal: controller.signal })
        clearTimeout(timeout)
        checks[name] = resp.ok ? 'healthy' : 'unhealthy'
      } catch {
        checks[name] = 'unreachable'
      }
    })
  )

  const allHealthy = Object.values(checks).every((s) => s === 'healthy')

  res.status(allHealthy ? 200 : 207).json({
    status: allHealthy ? 'ok' : 'degraded',
    service: 'api-gateway',
    version: '1.0.0',
    uptime: Math.floor(startTime),
    timestamp: new Date().toISOString(),
    services: checks,
  })
})

// Error handling
app.use(errorHandler)

// Start server
const PORT = config.port
const HOST = '0.0.0.0'

app.listen(PORT, HOST, () => {
  console.log(`API Gateway running on http://${HOST}:${PORT}`)
  console.log(`Environment: ${config.nodeEnv}`)
  console.log('Routing:')
  console.log('  /api/fixtures/*    -> match-service:3001')
  console.log('  /api/teams/*       -> match-service:3001')
  console.log('  /api/leagues/*     -> match-service:3001')
  console.log('  /api/stats/*       -> stats-service:3002')
  console.log('  /api/auth/*        -> user-service:3003')
  console.log('  /api/profile/*     -> user-service:3003')
  console.log('  /api/predictions/* -> ml-service:8000')
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

export default app
