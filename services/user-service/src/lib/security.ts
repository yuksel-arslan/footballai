import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { config } from '../config'

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
  const expires = new Date(Date.now() + AUTH_CONSTANTS.EMAIL_VERIFICATION_EXPIRES_HOURS * 60 * 60 * 1000)
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
  const expires = new Date(Date.now() + AUTH_CONSTANTS.PASSWORD_RESET_EXPIRES_HOURS * 60 * 60 * 1000)
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
  return new Date(Date.now() + AUTH_CONSTANTS.LOCKOUT_DURATION_MINUTES * 60 * 1000)
}

export function shouldLockAccount(failedAttempts: number): boolean {
  return failedAttempts >= AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS
}

// ============================================
// TWO-FACTOR AUTHENTICATION
// ============================================

export function generate2FASecret(email: string): {
  secret: string
  otpauthUrl: string
} {
  const secret = speakeasy.generateSecret({
    name: `FootballAI (${email})`,
    issuer: 'FootballAI',
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
    window: AUTH_CONSTANTS.TOTP_WINDOW,
  })
}

export function generateBackupCodes(): { codes: string[]; hashedCodes: string[] } {
  const codes: string[] = []
  const hashedCodes: string[] = []

  for (let i = 0; i < AUTH_CONSTANTS.BACKUP_CODES_COUNT; i++) {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase()
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase()
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

  const remainingCodes = [...hashedCodes]
  remainingCodes.splice(index, 1)

  return { valid: true, remainingCodes }
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
}, 60000)

// ============================================
// HELPERS
// ============================================

export function getClientIp(req: { headers: Record<string, string | string[] | undefined>; ip?: string }): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() || 'unknown'
  return req.ip || 'unknown'
}

export function getUserAgent(req: { headers: Record<string, string | string[] | undefined> }): string {
  const ua = req.headers['user-agent']
  return typeof ua === 'string' ? ua : 'unknown'
}

// ============================================
// PASSWORD VALIDATION
// ============================================

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) errors.push('Password must be at least 8 characters')
  if (password.length > 128) errors.push('Password must be at most 128 characters')
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter')
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter')
  if (!/[0-9]/.test(password)) errors.push('Password must contain a number')

  return { valid: errors.length === 0, errors }
}

export function isAdminEmail(email: string): boolean {
  const adminEmails = ['contact@yukselarslan.com', 'admin@footballai.io']
  return adminEmails.includes(email.toLowerCase())
}

// ============================================
// CONSTANTS
// ============================================

export const AUTH_CONSTANTS = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,
  EMAIL_VERIFICATION_EXPIRES_HOURS: 24,
  PASSWORD_RESET_EXPIRES_HOURS: 1,
  BACKUP_CODES_COUNT: 10,
  TOTP_WINDOW: 1,
  MAX_PASSWORD_RESET_REQUESTS_PER_HOUR: 3,
} as const
