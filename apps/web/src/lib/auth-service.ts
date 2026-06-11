import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    process.env.APP_DATABASE_URL
      ? { datasourceUrl: process.env.APP_DATABASE_URL }
      : undefined
  )
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const JWT_EXPIRES_IN = '7d'
const ADMIN_EMAILS = ['contact@yukselarslan.com', 'admin@footballai.io']

// Explicit select to avoid schema-drift errors (e.g. stale columns like
// discord_user_id that exist in generated client but not in the database).
const USER_SELECT = {
  id: true,
  email: true,
  passwordHash: true,
  fullName: true,
  avatarUrl: true,
  isAdmin: true,
  emailVerified: true,
  emailVerifiedAt: true,
  twoFactorEnabled: true,
  twoFactorSecret: true,
  preferredLang: true,
  theme: true,
  googleId: true,
  loginAttempts: true,
  accountLocked: true,
  accountLockedUntil: true,
  lastLoginAt: true,
  lastLoginIp: true,
  lastLoginDevice: true,
} as const

export interface AuthUser {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  isAdmin: boolean
  emailVerified: boolean
  twoFactorEnabled: boolean
  preferredLang: string
  theme: string
}

function generateToken(user: {
  id: string
  email: string
  isAdmin: boolean
}): string {
  return jwt.sign(
    { userId: user.id, id: user.id, email: user.email, isAdmin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

export function verifyToken(
  token: string
): { userId: string; email: string; isAdmin: boolean } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch {
    return null
  }
}

export async function registerUser(
  email: string,
  password: string,
  name?: string
) {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (existing) {
    throw new Error('Bu e-posta zaten kayıtlı')
  }

  if (password.length < 8) {
    throw new Error('Şifre en az 8 karakter olmalı')
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: name || null,
      isAdmin: ADMIN_EMAILS.includes(email.toLowerCase()),
      // This direct-auth fallback has no mailer — auto-verify so the account
      // never waits on an email that can't be sent.
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
    select: USER_SELECT,
  })

  const token = generateToken({
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
  })

  return {
    user: mapUser(user),
    token,
  }
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: USER_SELECT,
  })

  if (!user || !user.passwordHash) {
    throw new Error('Geçersiz e-posta veya şifre')
  }

  // Check account lockout
  if (
    user.accountLocked &&
    user.accountLockedUntil &&
    new Date() < user.accountLockedUntil
  ) {
    throw new Error(
      'Hesabınız geçici olarak kilitlendi. Lütfen daha sonra tekrar deneyin.'
    )
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) {
    const attempts = user.loginAttempts + 1
    const data: any = { loginAttempts: attempts }

    if (attempts >= 5) {
      data.accountLocked = true
      data.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000) // 30 min
    }

    await prisma.user.update({ where: { id: user.id }, data })
    throw new Error('Geçersiz e-posta veya şifre')
  }

  // Check 2FA
  if (user.twoFactorEnabled) {
    return { requires2FA: true, userId: user.id }
  }

  // Reset attempts on success
  await prisma.user.update({
    where: { id: user.id },
    data: {
      loginAttempts: 0,
      accountLocked: false,
      accountLockedUntil: null,
      lastLoginAt: new Date(),
    },
  })

  const token = generateToken({
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
  })

  return {
    user: mapUser(user),
    token,
  }
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  })
  if (!user) return null
  return mapUser(user)
}

function mapUser(user: any): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    preferredLang: user.preferredLang || 'tr',
    theme: user.theme || 'dark',
  }
}

// ============================================
// GOOGLE OAUTH
// ============================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

// Use canonical site URL for OAuth redirect to match Google Console registration
function getOAuthRedirectUri(fallbackUrl: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    fallbackUrl
  return `${baseUrl}/api/auth/google/callback`
}

export function getGoogleAuthUrl(appUrl: string): string | null {
  if (!GOOGLE_CLIENT_ID) return null

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: getOAuthRedirectUri(appUrl),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function handleGoogleCallback(
  code: string,
  appUrl: string,
  ip?: string,
  userAgent?: string
) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth yapılandırılmamış')
  }

  // Step 1: Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: getOAuthRedirectUri(appUrl),
      grant_type: 'authorization_code',
    }),
  })

  const tokenData = await tokenRes.json()

  if (!tokenRes.ok) {
    console.error('Google token exchange failed:', tokenData)
    throw new Error(
      `Google token exchange failed: ${tokenData.error || tokenRes.status}`
    )
  }

  // Step 2: Get user info
  const userInfoRes = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    }
  )

  if (!userInfoRes.ok) {
    throw new Error(`Google userinfo failed: ${userInfoRes.status}`)
  }

  const googleUser = await userInfoRes.json()
  const { id: googleId, email, name, picture } = googleUser

  // Step 3: Find or create user
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
    select: USER_SELECT,
  })

  if (user) {
    // Update existing user
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: user.googleId || googleId,
        fullName: user.fullName || name,
        avatarUrl: user.avatarUrl || picture,
        emailVerified: true,
        emailVerifiedAt: user.emailVerifiedAt || new Date(),
        lastLoginAt: new Date(),
        lastLoginIp: ip || null,
        lastLoginDevice: userAgent || null,
        loginAttempts: 0,
        accountLocked: false,
        accountLockedUntil: null,
      },
      select: USER_SELECT,
    })
  } else {
    // Create new user
    user = await prisma.user.create({
      data: {
        email,
        googleId,
        fullName: name || null,
        avatarUrl: picture || null,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        isAdmin: ADMIN_EMAILS.includes(email.toLowerCase()),
        lastLoginAt: new Date(),
        lastLoginIp: ip || null,
        lastLoginDevice: userAgent || null,
      },
      select: USER_SELECT,
    })
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
  })

  return { user: mapUser(user), token }
}
