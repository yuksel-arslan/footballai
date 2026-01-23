import dotenv from 'dotenv'

dotenv.config()

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  
  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  
  // Redis
  redisUrl: process.env.REDIS_URL || '',
  
  // API Football
  apiFootball: {
    baseUrl: 'https://v3.football.api-sports.io',
    key: process.env.API_FOOTBALL_KEY || '',
    timeout: 10000,
    rateLimitPerDay: 500, // Free tier limit
  },
  
  // Cache settings
  cache: {
    upcomingFixtures: 60 * 60, // 1 hour
    liveScores: 30, // 30 seconds
    teamInfo: 24 * 60 * 60, // 24 hours
    leagueInfo: 24 * 60 * 60, // 24 hours
  },
} as const

// Validate required env vars
const requiredEnvVars = ['DATABASE_URL', 'API_FOOTBALL_KEY']

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}
