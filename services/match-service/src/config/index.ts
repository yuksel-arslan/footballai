import dotenv from 'dotenv'

dotenv.config()

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  
  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  
  // Redis
  redisUrl: process.env.REDIS_URL || '',
  
  // API Football (Legacy - 500 req/day)
  apiFootball: {
    baseUrl: 'https://v3.football.api-sports.io',
    key: process.env.API_FOOTBALL_KEY || '',
    timeout: 10000,
    rateLimitPerDay: 500, // Free tier limit
  },

  // Football-Data.org (Primary - 10 req/min, top 12 leagues)
  footballData: {
    baseUrl: 'https://api.football-data.org/v4',
    key: process.env.FOOTBALL_DATA_KEY || '',
    timeout: 10000,
    rateLimitPerMinute: 10, // Free tier limit
  },

  // OpenLigaDB (Fallback - Unlimited, Bundesliga/CL focused)
  openLigaDB: {
    baseUrl: 'https://api.openligadb.de',
    timeout: 10000,
    // No rate limit, no API key required
  },
  
  // Authentication (JWT)
  auth: {
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // AI (Gemini)
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
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
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET']

// Optional but recommended API keys
const optionalEnvVars = ['API_FOOTBALL_KEY', 'FOOTBALL_DATA_KEY', 'GEMINI_API_KEY']

console.log('🔧 Initializing Match Service config...')
console.log(`   PORT: ${process.env.PORT || '3001 (default)'}`)
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`)

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`)
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
  // Validate JWT_SECRET length
  if (envVar === 'JWT_SECRET' && process.env[envVar] && process.env[envVar].length < 32) {
    console.error(`❌ JWT_SECRET must be at least 32 characters long`)
    throw new Error(`JWT_SECRET must be at least 32 characters long`)
  }
  console.log(`   ${envVar}: ✅ Set`)
}

// Warn about missing optional vars
for (const envVar of optionalEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️ Optional env var not set: ${envVar}`)
  }
}

// At least one football API key should be set
if (!process.env.API_FOOTBALL_KEY && !process.env.FOOTBALL_DATA_KEY) {
  console.warn('⚠️ No football API key set. OpenLigaDB will be used as fallback (limited coverage)')
}

// Warn if Gemini API key is missing
if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️ GEMINI_API_KEY not set. AI predictions will not be available.')
}
