import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const JWT_EXPIRES_IN = '7d'
const ADMIN_EMAILS = ['contact@yukselarslan.com', 'admin@footballai.io']

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
  const existing = await prisma.user.findUnique({ where: { email } })
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

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })

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
  const user = await prisma.user.findUnique({ where: { id: userId } })
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
