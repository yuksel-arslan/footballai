import dotenv from 'dotenv'

dotenv.config()

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3002', 10),

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Redis
  redisUrl: process.env.REDIS_URL || '',

  // Football-Data.org
  footballData: {
    baseUrl: 'https://api.football-data.org/v4',
    key: process.env.FOOTBALL_DATA_KEY || '',
    timeout: 10000,
    rateLimitPerMinute: 10,
  },

  // API-Football
  apiFootball: {
    baseUrl: 'https://v3.football.api-sports.io',
    key: process.env.API_FOOTBALL_KEY || '',
    timeout: 10000,
    rateLimitPerDay: 500,
  },

  // Cache TTLs (seconds)
  cache: {
    standings: 60 * 60,        // 1 hour
    teamStats: 30 * 60,        // 30 minutes
    teamForm: 30 * 60,         // 30 minutes
    h2h: 2 * 60 * 60,          // 2 hours
    compare: 30 * 60,          // 30 minutes
  },
} as const

// Validate required env vars
const requiredEnvVars = ['DATABASE_URL']
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`)
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}
