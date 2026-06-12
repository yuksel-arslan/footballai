import { z } from 'zod'

// Accepts BOTH `name` and `fullName` (the web client sends fullName), and the
// name is optional — an account is identified by email, a display name isn't
// worth failing registration over. Empty strings are treated as absent.
export const registerSchema = z
  .object({
    email: z.string().email('Geçerli bir e-posta girin'),
    password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
    name: z.string().optional(),
    fullName: z.string().optional(),
  })
  .transform((v) => ({
    email: v.email,
    password: v.password,
    name: (v.name ?? v.fullName ?? '').trim(),
  }))

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export interface AuthResponse {
  user: {
    id: string
    email: string
    name: string
    isAdmin?: boolean
  }
  token: string
}

export interface JWTPayload {
  userId: string
  iat?: number
  exp?: number
}

export interface UserWithRelations {
  id: string
  email: string
  fullName: string | null
  createdAt: Date
  favoriteTeams?: Array<{
    id: number
    userId: string
    teamId: number
    team?: {
      id: number
      name: string
      logoUrl: string | null
    }
  }>
  favoriteLeagues?: Array<{
    id: number
    userId: string
    leagueId: number
    league?: {
      id: number
      name: string
      logoUrl: string | null
    }
  }>
}
