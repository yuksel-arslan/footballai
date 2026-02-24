import express, { type Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { config } from './config'
import { errorHandler } from './middleware/error-handler'
import { requestLogger } from './middleware/request-logger'
import fixturesRouter from './routes/fixtures'
import teamsRouter from './routes/teams'
import leaguesRouter from './routes/leagues'
import predictionRouter from './routes/prediction.routes'

const app: Application = express()

// Middleware
app.use(helmet())
app.use(cors())
app.use(compression())
app.use(express.json())
app.use(requestLogger)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'match-service', timestamp: new Date() })
})

// Routes
app.use('/api/fixtures', fixturesRouter)
app.use('/api/teams', teamsRouter)
app.use('/api/leagues', leaguesRouter)
app.use('/api/predictions', predictionRouter)

// Error handling
app.use(errorHandler)

// Start server
const PORT = config.port || 3001
const HOST = '0.0.0.0' // Required for containerized environments (Railway, Docker)

app.listen(PORT, HOST, () => {
  console.log(`🚀 Match Service running on http://${HOST}:${PORT}`)
  console.log(`📊 Environment: ${config.nodeEnv}`)
  console.log(`✅ Health check available at /health`)
})

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

export default app
