/**
 * Environment configuration for FootballAI Web App
 */

const env = {
  apiGatewayUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  dataSource: (process.env.NEXT_PUBLIC_DATA_SOURCE || 'proxy') as
    | 'proxy'
    | 'gateway',
  footballDataKey:
    process.env.FOOTBALL_DATA_KEY ||
    process.env.NEXT_PUBLIC_FOOTBALL_DATA_KEY ||
    '',
  apiFootballKey:
    process.env.API_FOOTBALL_KEY ||
    process.env.NEXT_PUBLIC_API_FOOTBALL_KEY ||
    '',
  geminiApiKey:
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  jwtSecret: process.env.JWT_SECRET || '',
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  wsUrl:
    process.env.NEXT_PUBLIC_WS_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://footballai.io',
  nodeEnv: process.env.NODE_ENV || 'development',
  enableWebSocket: process.env.NEXT_PUBLIC_ENABLE_WS !== 'false',
  enablePredictions: process.env.NEXT_PUBLIC_ENABLE_PREDICTIONS !== 'false',
  enableAuth: process.env.NEXT_PUBLIC_ENABLE_AUTH !== 'false',
} as const

export default env

export const isProd = env.nodeEnv === 'production'
export const isGatewayMode = env.dataSource === 'gateway'
export const getApiBaseUrl = () => (isGatewayMode ? env.apiGatewayUrl : '')
