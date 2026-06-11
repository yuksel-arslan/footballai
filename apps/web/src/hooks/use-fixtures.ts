'use client'

import { useQuery } from '@tanstack/react-query'
import { api, type Fixture, type Standing, type League } from '@/lib/api'

export function useUpcomingFixtures() {
  return useQuery<Fixture[]>({
    queryKey: ['fixtures', 'upcoming'],
    queryFn: () => api.getUpcomingFixtures(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    placeholderData: [],
  })
}

export function useLiveFixtures() {
  return useQuery<Fixture[]>({
    queryKey: ['fixtures', 'live'],
    queryFn: () => api.getLiveFixtures(),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30,
    retry: 2,
    placeholderData: [],
  })
}

export function useFinishedFixtures() {
  return useQuery<Fixture[]>({
    queryKey: ['fixtures', 'finished'],
    queryFn: () => api.getFinishedFixtures(),
    staleTime: 1000 * 60 * 5,
    retry: 2,
    placeholderData: [],
  })
}

export function useFixture(id: number) {
  return useQuery<Fixture | null>({
    queryKey: ['fixtures', id],
    queryFn: () => api.getFixtureById(id),
    staleTime: 1000 * 60,
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

export function useFixturesByLeague(leagueCode: string) {
  return useQuery<Fixture[]>({
    queryKey: ['fixtures', 'league', leagueCode],
    queryFn: () => api.getFixturesByLeague(leagueCode),
    staleTime: 1000 * 60 * 5,
    enabled: !!leagueCode,
    retry: 2,
    placeholderData: [],
  })
}

export function useStandings(leagueCode: string) {
  return useQuery<Standing[]>({
    queryKey: ['standings', leagueCode],
    queryFn: () => api.getStandings(leagueCode),
    staleTime: 1000 * 60 * 10,
    enabled: !!leagueCode,
    retry: 2,
    placeholderData: [],
  })
}

export function useLeagues() {
  return useQuery<League[]>({
    queryKey: ['leagues'],
    queryFn: () => api.getLeagues(),
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
  })
}

/**
 * Competitions currently in season (calendar-driven League.active). The
 * matches list filters to these so off-season domestic leagues don't crowd
 * out the running tournament. Empty set = fail open (no filtering).
 */
export function useActiveLeagues() {
  return useQuery<{ apiIds: number[]; names: string[] }>({
    queryKey: ['active-leagues'],
    queryFn: async () => {
      const res = await fetch('/api/fixtures/active-leagues')
      if (!res.ok) return { apiIds: [], names: [] }
      const json = (await res.json()) as {
        data?: { apiIds?: number[]; names?: string[] }
      }
      return {
        apiIds: json.data?.apiIds ?? [],
        names: json.data?.names ?? [],
      }
    },
    staleTime: 1000 * 60 * 30,
  })
}
