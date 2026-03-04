// Shared backend service URL configuration
// In production, returns empty string when env vars not set (fail fast)
// In development, falls back to localhost for local services

const isDev = process.env.NODE_ENV === 'development'

export const GATEWAY_URL =
  process.env.API_GATEWAY_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (isDev ? 'http://localhost:3000' : '')

export const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || (isDev ? 'http://localhost:3003' : '')
