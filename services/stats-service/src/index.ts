import express, { type Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { config } from './config'
import { logger } from './lib/logger'
import { errorHandler } from './middleware/error-handler'
import { requestLogger } from './middleware/request-logger'
import { generalLimiter } from './middleware/rate-limiter'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './config/swagger'
import statsRouter from './routes/stats.routes'

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
app.use(express.json())
app.use(requestLogger)
app.use(generalLimiter)

// Health check
app.get('/health', async (_req, res) => {
  const checks: Record<string, string> = {}

  // Redis check
  try {
    const { cacheService } = await import('./services/cache')
    await cacheService.get('health-check')
    checks.redis = 'healthy'
  } catch {
    checks.redis = 'unhealthy'
  }

  const allHealthy = Object.values(checks).every((s) => s === 'healthy')

  res.status(allHealthy ? 200 : 207).json({
    status: allHealthy ? 'ok' : 'degraded',
    service: 'stats-service',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
  })
})

// API Docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// Routes
app.use('/api/stats', statsRouter)

// Error handling
app.use(errorHandler)

// Start server
const PORT = config.port
// IPv6 wildcard — required for Railway private networking (IPv6-only).
const HOST = '::'

app.listen(PORT, HOST, () => {
  logger.info(`Stats Service running on http://${HOST}:${PORT}`)
  logger.info({ env: config.nodeEnv }, `Environment: ${config.nodeEnv}`)
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
