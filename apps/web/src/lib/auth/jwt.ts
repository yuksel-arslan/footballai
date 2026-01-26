import jwt from 'jsonwebtoken'
import { AUTH_CONFIG } from './config'

export interface JWTPayload {
  id: string
  email: string
  name?: string
  isAdmin: boolean
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, AUTH_CONFIG.JWT_SECRET, {
    expiresIn: AUTH_CONFIG.JWT_EXPIRES_IN,
  })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, AUTH_CONFIG.JWT_SECRET) as JWTPayload
    return decoded
  } catch {
    return null
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload
  } catch {
    return null
  }
}

// Get token from cookies
export function getTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    if (key && value) {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, string>)

  return cookies[AUTH_CONFIG.COOKIE_NAME] || null
}

// Create cookie string
export function createAuthCookie(token: string): string {
  const maxAge = AUTH_CONFIG.COOKIE_MAX_AGE
  const secure = process.env.NODE_ENV === 'production'
  const sameSite = 'lax'

  return `${AUTH_CONFIG.COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=${sameSite}${secure ? '; Secure' : ''}`
}

export function createSessionCookie(): string {
  const maxAge = AUTH_CONFIG.COOKIE_MAX_AGE
  const secure = process.env.NODE_ENV === 'production'

  return `${AUTH_CONFIG.SESSION_COOKIE_NAME}=true; Path=/; Max-Age=${maxAge}; SameSite=lax${secure ? '; Secure' : ''}`
}

export function clearAuthCookies(): string[] {
  return [
    `${AUTH_CONFIG.COOKIE_NAME}=; Path=/; Max-Age=0`,
    `${AUTH_CONFIG.SESSION_COOKIE_NAME}=; Path=/; Max-Age=0`,
  ]
}
