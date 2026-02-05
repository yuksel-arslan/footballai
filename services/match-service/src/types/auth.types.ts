import { z } from 'zod';

// Registration schema
export const registerSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
  name: z.string().min(2, 'İsim en az 2 karakter olmalıdır'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
  password: z.string().min(1, 'Şifre gereklidir'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Auth response
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

// User with relations
export interface UserWithRelations {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  favoriteTeams?: Array<{
    id: string;
    teamId: number;
    team?: {
      id: number;
      name: string;
      logo: string | null;
    };
  }>;
  favoriteLeagues?: Array<{
    id: string;
    leagueId: number;
    league?: {
      id: number;
      name: string;
      logo: string | null;
    };
  }>;
}
