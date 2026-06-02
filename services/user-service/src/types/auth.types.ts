import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

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
