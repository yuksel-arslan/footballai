'use client'

import { useQuery } from '@tanstack/react-query'
import { api, Fixture } from '@/lib/api'

export function useUpcomingFixtures() {
  return useQuery<Fixture[]>({
    queryKey: ['fixtures', 'upcoming'],
    queryFn: () => api.getUpcomingFixtures(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  })
}

export function useLiveFixtures() {
  return useQuery<Fixture[]>({
    queryKey: ['fixtures', 'live'],
    queryFn: () => api.getLiveFixtures(),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
    retry: 2,
  })
}

export function useFixture(id: number) {
  return useQuery<Fixture | null>({
    queryKey: ['fixtures', id],
    queryFn: () => api.getFixtureById(id),
    staleTime: 1000 * 60, // 1 minute
    enabled: !!id,
  })
}

export function useAllFixtures() {
  const upcoming = useUpcomingFixtures()
  const live = useLiveFixtures()

  const allFixtures = [
    ...(live.data || []),
    ...(upcoming.data || []),
  ]

  const refetch = async () => {
    await Promise.all([upcoming.refetch(), live.refetch()])
  }

  return {
    data: allFixtures,
    isLoading: upcoming.isLoading || live.isLoading,
    isError: upcoming.isError || live.isError,
    error: upcoming.error || live.error,
    refetch,
  }
}

export function useStandings(leagueCode: string) {
  return useQuery({
    queryKey: ['standings', leagueCode],
    queryFn: () => api.getStandings(leagueCode),
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!leagueCode,
    retry: 2,
  })
}
