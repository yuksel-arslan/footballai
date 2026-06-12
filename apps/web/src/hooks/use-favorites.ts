'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Account-backed favorites (DB via /api/profile/favorites/*) with a
 * localStorage fallback for guests and for entities the DB hasn't ingested
 * yet. Display state is the union; mutations try the server first and fall
 * back to local, so a toggle always sticks.
 */

export const STORAGE_KEY_TEAMS = 'favorite-teams'
export const STORAGE_KEY_LEAGUES = 'favorite-leagues'

export interface FavTeam {
  id: string // team apiId as string
  name: string
  logoUrl?: string
  league?: string
}

export function loadLocal<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const s = localStorage.getItem(key)
    return s ? (JSON.parse(s) as T[]) : []
  } catch {
    return []
  }
}

export function saveLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full/blocked — favorites simply won't persist locally
  }
}

export interface ServerFavLeague {
  apiId: number
  name: string
  country: string
  logoUrl?: string | null
}
export interface ServerFavTeam {
  apiId: number
  name: string
  logoUrl?: string | null
  country?: string
  league?: string | null
}

export function useServerFavoriteLeagues() {
  const authed = useAuthStore((s) => s.isAuthenticated)
  return useQuery<ServerFavLeague[]>({
    queryKey: ['favorites', 'leagues'],
    enabled: authed,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await fetch('/api/profile/favorites/leagues')
      if (!res.ok) throw new Error('favorites_leagues_failed')
      const json = (await res.json()) as { data?: ServerFavLeague[] }
      return json.data ?? []
    },
  })
}

export function useServerFavoriteTeams() {
  const authed = useAuthStore((s) => s.isAuthenticated)
  return useQuery<ServerFavTeam[]>({
    queryKey: ['favorites', 'teams'],
    enabled: authed,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await fetch('/api/profile/favorites/teams')
      if (!res.ok) throw new Error('favorites_teams_failed')
      const json = (await res.json()) as { data?: ServerFavTeam[] }
      return json.data ?? []
    },
  })
}

/** POST/DELETE a favorite on the server; returns false when it didn't stick
 * (guest, entity not in DB yet, network) so callers can fall back to local. */
export async function mutateServerFavorite(
  kind: 'leagues' | 'teams',
  apiId: number,
  on: boolean
): Promise<boolean> {
  try {
    const res = await fetch(`/api/profile/favorites/${kind}/${apiId}`, {
      method: on ? 'POST' : 'DELETE',
    })
    return res.ok
  } catch {
    return false
  }
}

export function useInvalidateFavorites() {
  const qc = useQueryClient()
  return (kind: 'leagues' | 'teams') =>
    qc.invalidateQueries({ queryKey: ['favorites', kind] })
}
