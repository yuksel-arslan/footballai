import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { config } from './config'
import { errorHandler } from './middleware/error-handler'
import { requestLogger } from './middleware/request-logger'
import authRouter from './routes/auth'
import usersRouter from './routes/users'

const app = express()

// Middleware
app.use(helmet())
app.use(cors())
app.use(compression())
app.use(express.json())
app.use(requestLogger)

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { error: 'Too many attempts, please try again later' },
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-service', timestamp: new Date() })
})

// Routes
app.use('/api/auth', authLimiter, authRouter)
app.use('/api', usersRouter)

// Error handling
app.use(errorHandler)

// Start server
const PORT = config.port || 3003
app.listen(PORT, () => {
  console.log(`👤 User Service running on port ${PORT}`)
  console.log(`👤 Environment: ${config.nodeEnv}`)
})

export default app
