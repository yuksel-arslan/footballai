import dotenv from 'dotenv'

dotenv.config()

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
}

/** Service URLs for proxying */
export const services = {
  matchService: process.env.MATCH_SERVICE_URL || 'http://localhost:3001',
  statsService: process.env.STATS_SERVICE_URL || 'http://localhost:3002',
  userService: process.env.USER_SERVICE_URL || 'http://localhost:3003',
  mlService: process.env.ML_SERVICE_URL || 'http://localhost:8000',
} as const

/** Route-to-service mapping */
export const routeMap = [
  // Match Service
  { path: '/api/fixtures', target: services.matchService },
  { path: '/api/teams', target: services.matchService },
  { path: '/api/leagues', target: services.matchService },

  // Stats Service
  { path: '/api/stats', target: services.statsService },

  // User Service
  { path: '/api/auth', target: services.userService },
  { path: '/api/profile', target: services.userService },

  // ML Service
  { path: '/api/predictions', target: services.mlService },
] as const
