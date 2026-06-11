// Shared backend service URL configuration
// In production, returns empty string when env vars not set (fail fast)
// In development, falls back to localhost for local services

const isDev = process.env.NODE_ENV === 'development'

export const GATEWAY_URL =
  process.env.API_GATEWAY_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (isDev ? 'http://localhost:3000' : '')

// Auth routes must reach the REAL user-service (it owns the mailer, 2FA,
// audit log, lockout). The API gateway proxies /api/auth/* → user-service,
// so when USER_SERVICE_URL isn't set we fall back to the gateway rather than
// silently dropping to the web's direct-Prisma auth (which has no mailer and
// would never send a verification email).
export const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL ||
  GATEWAY_URL ||
  (isDev ? 'http://localhost:3003' : '')
