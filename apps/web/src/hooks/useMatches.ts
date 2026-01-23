'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface UseMatchesParams {
  date?: string
  league?: number
  team?: number
  limit?: number
  offset?: number
}

export function useUpcomingMatches(params?: UseMatchesParams) {
  return useQuery({
    queryKey: ['matches', 'upcoming', params],
    queryFn: () => api.matches.getUpcoming(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  })
}

export function useLiveMatches() {
  return useQuery({
    queryKey: ['matches', 'live'],
    queryFn: () => api.matches.getLive(),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
  })
}

export function useMatch(id: number) {
  return useQuery({
    queryKey: ['matches', id],
    queryFn: () => api.matches.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Today's date formatted as YYYY-MM-DD
export function useTodayMatches() {
  const today = new Date().toISOString().split('T')[0]
  return useUpcomingMatches({ date: today })
}
