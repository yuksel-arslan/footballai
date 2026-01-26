// Auth Configuration

export const AUTH_CONFIG = {
  // JWT Settings
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  JWT_EXPIRES_IN: '7d',

  // Security Settings
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,
  EMAIL_VERIFICATION_EXPIRES_HOURS: 24,
  PASSWORD_RESET_EXPIRES_HOURS: 1,

  // 2FA Settings
  BACKUP_CODES_COUNT: 10,
  TOTP_WINDOW: 1, // ±1 time step for clock drift

  // Rate Limiting
  MAX_EMAIL_REQUESTS_PER_HOUR: 5,
  MAX_PASSWORD_RESET_REQUESTS_PER_HOUR: 3,

  // Cookie Settings
  COOKIE_NAME: 'auth-token',
  SESSION_COOKIE_NAME: 'auth-session',
  COOKIE_MAX_AGE: 7 * 24 * 60 * 60, // 7 days in seconds

  // Admin Emails (hardcoded for initial setup)
  ADMIN_EMAILS: ['contact@yukselarslan.com', 'admin@futballai.com'] as string[],

  // OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',

  // URLs
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
} as const

// Password validation
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`En az ${PASSWORD_REQUIREMENTS.minLength} karakter olmalı`)
  }
  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`En fazla ${PASSWORD_REQUIREMENTS.maxLength} karakter olmalı`)
  }
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('En az bir büyük harf içermeli')
  }
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('En az bir küçük harf içermeli')
  }
  if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
    errors.push('En az bir rakam içermeli')
  }

  return { valid: errors.length === 0, errors }
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
