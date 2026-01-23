import dotenv from 'dotenv'

dotenv.config()

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3002', 10),

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Redis
  redisUrl: process.env.REDIS_URL || '',

  // API Football (for syncing stats)
  apiFootball: {
    baseUrl: 'https://v3.football.api-sports.io',
    key: process.env.API_FOOTBALL_KEY || '',
    timeout: 10000,
  },

  // Cache settings
  cache: {
    teamStats: 60 * 60, // 1 hour
    standings: 30 * 60, // 30 minutes
    h2h: 24 * 60 * 60, // 24 hours
    form: 60 * 60, // 1 hour
  },

  // Current season
  currentSeason: 2025,
} as const

// Validate required env vars
const requiredEnvVars = ['DATABASE_URL']

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Missing environment variable: ${envVar}`)
  }
}
