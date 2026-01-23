import dotenv from 'dotenv'

dotenv.config()

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3003', 10),

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    issuer: 'footballai',
    audience: 'footballai-users',
  },

  // Password hashing
  bcrypt: {
    saltRounds: 12,
  },
} as const

// Validate required env vars in production
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET']

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`)
    }
  }
}
