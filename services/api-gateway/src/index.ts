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

// Middleware
app.use(helmet())
app.use(cors())
app.use(compression())
app.use(requestLogger)
app.use(generalLimiter)

// Proxy routes
app.use(proxyRouter)

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
