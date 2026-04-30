// Force IPv6 preference for DNS lookups so internal Railway hostnames
// (which are IPv6-only) resolve correctly when this service calls others.
// Must run before any HTTP client (fetch / undici) initialises its DNS pool.
import dns from 'node:dns'
dns.setDefaultResultOrder('ipv6first')

import express, { type Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { config } from './config/services'
import { logger } from './lib/logger'
import { requestLogger } from './middleware/logger'
import { errorHandler } from './middleware/error-handler'
import { generalLimiter } from './middleware/rate-limiter'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './config/swagger'
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

// API Docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

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
// IPv6 wildcard — required for Railway private networking (IPv6-only).
const HOST = '::'

app.listen(PORT, HOST, () => {
  logger.info(`API Gateway running on http://${HOST}:${PORT}`)
  logger.info({ env: config.nodeEnv }, `Environment: ${config.nodeEnv}`)
  logger.info('Routing configured for all services')
})

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught Exception')
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled Rejection')
  process.exit(1)
})

export default app
