import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { nanoid } from 'nanoid'
import { AUTH_CONFIG } from './config'

// ============================================
// PASSWORD HASHING
// ============================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ============================================
// TOKEN GENERATION
// ============================================

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function generateReferralCode(): string {
  return nanoid(8).toUpperCase()
}

// ============================================
// EMAIL VERIFICATION
// ============================================

export function createEmailVerificationToken(): {
  token: string
  hashedToken: string
  expires: Date
} {
  const token = generateSecureToken()
  const hashedToken = hashToken(token)
  const expires = new Date(Date.now() + AUTH_CONFIG.EMAIL_VERIFICATION_EXPIRES_HOURS * 60 * 60 * 1000)

  return { token, hashedToken, expires }
}

// ============================================
// PASSWORD RESET
// ============================================

export function createPasswordResetToken(): {
  token: string
  hashedToken: string
  expires: Date
} {
  const token = generateSecureToken()
  const hashedToken = hashToken(token)
  const expires = new Date(Date.now() + AUTH_CONFIG.PASSWORD_RESET_EXPIRES_HOURS * 60 * 60 * 1000)

  return { token, hashedToken, expires }
}

// ============================================
// ACCOUNT LOCKOUT
// ============================================

export function isAccountLocked(lockedUntil: Date | null): boolean {
  if (!lockedUntil) return false
  return new Date() < lockedUntil
}

export function calculateLockoutTime(): Date {
  return new Date(Date.now() + AUTH_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000)
}

export function shouldLockAccount(failedAttempts: number): boolean {
  return failedAttempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS
}

// ============================================
// TWO-FACTOR AUTHENTICATION
// ============================================

export function generate2FASecret(email: string): {
  secret: string
  otpauthUrl: string
} {
  const secret = speakeasy.generateSecret({
    name: `FutballAI (${email})`,
    issuer: 'FutballAI',
    length: 32,
  })

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url || '',
  }
}

export async function generateQRCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl)
}

export function verify2FACode(secret: string, code: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: AUTH_CONFIG.TOTP_WINDOW,
  })
}

export function generateBackupCodes(): { codes: string[]; hashedCodes: string[] } {
  const codes: string[] = []
  const hashedCodes: string[] = []

  for (let i = 0; i < AUTH_CONFIG.BACKUP_CODES_COUNT; i++) {
    // Generate code in XXXX-XXXX format
    const part1 = nanoid(4).toUpperCase()
    const part2 = nanoid(4).toUpperCase()
    const code = `${part1}-${part2}`

    codes.push(code)
    hashedCodes.push(hashToken(code))
  }

  return { codes, hashedCodes }
}

export function verifyBackupCode(code: string, hashedCodes: string[]): {
  valid: boolean
  remainingCodes: string[]
} {
  const hashedInput = hashToken(code.toUpperCase())
  const index = hashedCodes.findIndex(hc => hc === hashedInput)

  if (index === -1) {
    return { valid: false, remainingCodes: hashedCodes }
  }

  // Remove used code
  const remainingCodes = [...hashedCodes]
  remainingCodes.splice(index, 1)

  return { valid: true, remainingCodes }
}

// ============================================
// SUSPICIOUS ACTIVITY DETECTION
// ============================================

export interface LoginAttempt {
  ip: string
  userAgent: string
  timestamp: Date
}

export function detectSuspiciousActivity(
  recentAttempts: LoginAttempt[],
  currentIp: string
): { suspicious: boolean; reason?: string } {
  // Check for multiple IPs in last 24 hours
  const last24Hours = Date.now() - 24 * 60 * 60 * 1000
  const recentIps = new Set(
    recentAttempts
      .filter(a => a.timestamp.getTime() > last24Hours)
      .map(a => a.ip)
  )

  if (recentIps.size > 3) {
    return { suspicious: true, reason: 'Birden fazla IP adresinden giriş denemesi' }
  }

  // Check for new IP
  if (!recentIps.has(currentIp) && recentIps.size > 0) {
    return { suspicious: true, reason: 'Yeni cihaz veya konum tespit edildi' }
  }

  return { suspicious: false }
}

// ============================================
// RATE LIMITING (Simple in-memory)
// ============================================

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Every minute

// ============================================
// HELPERS
// ============================================

export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}

export function getUserAgent(headers: Headers): string {
  return headers.get('user-agent') || 'unknown'
}

export function isAdminEmail(email: string): boolean {
  return AUTH_CONFIG.ADMIN_EMAILS.includes(email.toLowerCase())
}
