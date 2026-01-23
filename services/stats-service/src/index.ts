import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { config } from './config'
import { errorHandler } from './middleware/error-handler'
import { requestLogger } from './middleware/request-logger'
import statsRouter from './routes/stats'

const app = express()

// Middleware
app.use(helmet())
app.use(cors())
app.use(compression())
app.use(express.json())
app.use(requestLogger)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'stats-service', timestamp: new Date() })
})

// Routes
app.use('/api/stats', statsRouter)

// Error handling
app.use(errorHandler)

// Start server
const PORT = config.port || 3002
app.listen(PORT, () => {
  console.log(`📊 Stats Service running on port ${PORT}`)
  console.log(`📊 Environment: ${config.nodeEnv}`)
})

export default app
