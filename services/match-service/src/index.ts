import express, { type Application } from 'express'
import { createServer } from 'http'
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
import fixturesRouter from './routes/fixtures'
import teamsRouter from './routes/teams'
import leaguesRouter from './routes/leagues'
import predictionRouter from './routes/prediction.routes'
import { setupWebSocket } from './services/websocket'
import { startCronJobs } from './services/cron'

const app: Application = express()
const server = createServer(app)

// WebSocket
const io = setupWebSocket(server)

// Make io accessible from routes if needed
app.set('io', io)

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
    const { cache } = await import('./services/cache')
    await cache.get('health-check')
    checks.redis = 'healthy'
  } catch {
    checks.redis = 'unhealthy'
  }

  const allHealthy = Object.values(checks).every((s) => s === 'healthy')

  res.status(allHealthy ? 200 : 207).json({
    status: allHealthy ? 'ok' : 'degraded',
    service: 'match-service',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    websocket: { connected: io.engine.clientsCount },
    checks,
  })
})

// API Docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// Routes
app.use('/api/fixtures', fixturesRouter)
app.use('/api/teams', teamsRouter)
app.use('/api/leagues', leaguesRouter)
app.use('/api/predictions', predictionRouter)

// Error handling
app.use(errorHandler)

// Start server (using http server for WebSocket support)
const PORT = config.port || 3001
// Listen on IPv6 wildcard (`::`) — Node accepts both IPv4 and IPv6 on this
// address. Railway's private networking is IPv6-only, so binding to 0.0.0.0
// (IPv4-only wildcard) makes service-to-service internal calls fail.
const HOST = '::'

server.listen(PORT, HOST, () => {
  logger.info(`Match Service running on http://${HOST}:${PORT}`)
  logger.info(`WebSocket available at ws://${HOST}:${PORT}/ws`)
  logger.info({ env: config.nodeEnv }, `Environment: ${config.nodeEnv}`)

  // Start scheduled jobs
  startCronJobs()
})

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught Exception')
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled Rejection')
  process.exit(1)
})

export default app
