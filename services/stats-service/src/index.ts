import express, { type Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { config } from './config'
import { errorHandler } from './middleware/error-handler'
import { requestLogger } from './middleware/request-logger'
import statsRouter from './routes/stats.routes'

const app: Application = express()

// Middleware
app.use(helmet())
app.use(cors())
app.use(compression())
app.use(express.json())
app.use(requestLogger)

// Health check
app.get('/health', async (_req, res) => {
  const checks: Record<string, string> = {}

  // Redis check
  try {
    const { CacheService } = await import('./services/cache')
    const cache = new CacheService()
    await cache.get('health-check')
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

// Routes
app.use('/api/stats', statsRouter)

// Error handling
app.use(errorHandler)

// Start server
const PORT = config.port
const HOST = '0.0.0.0'

app.listen(PORT, HOST, () => {
  console.log(`Stats Service running on http://${HOST}:${PORT}`)
  console.log(`Environment: ${config.nodeEnv}`)
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
