'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { getApiBaseUrl } from '@/lib/env'
import type { TeamFormData } from './use-match-detail'

export interface TeamDetail {
  id: number
  apiId: number
  name: string
  code?: string
  logoUrl?: string
  country: string
  founded?: number
  venueName?: string
  venueCity?: string
  leagueId?: number
  league?: {
    id: number
    name: string
    logoUrl?: string
  }
}

export interface TeamStatsData {
  id: number
  teamId: number
  team: { id: number; name: string; logoUrl?: string }
  league?: { id: number; name: string; logoUrl?: string }
  season: number
  matchesPlayed: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  cleanSheets: number
  homeWins: number
  awayWins: number
  lastFiveForm?: string
  leaguePosition?: number
  points: number
}

interface FixtureItem {
  id: number
  homeTeam: { id: number; name: string; logoUrl?: string }
  awayTeam: { id: number; name: string; logoUrl?: string }
  league: { id: number; name: string }
  matchDate: string
  status: string
  homeScore?: number | null
  awayScore?: number | null
}

export function useTeamDetail(teamId: number) {
  return useQuery<TeamDetail | null>({
    queryKey: ['team-detail', teamId],
    queryFn: async () => {
      const base = getApiBaseUrl()
      const res = await fetchWithRetry<{ success: boolean; data: TeamDetail }>(
        `${base}/api/teams/${teamId}`
      )
      return res.data
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useTeamFixtures(teamId: number) {
  return useQuery<FixtureItem[]>({
    queryKey: ['team-fixtures', teamId],
    queryFn: async () => {
      const base = getApiBaseUrl()
      const res = await fetchWithRetry<{ success: boolean; data: FixtureItem[] }>(
        `${base}/api/teams/${teamId}/fixtures`
      )
      return res.data
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5,
    placeholderData: [],
  })
}

export function useTeamStats(teamId: number) {
  return useQuery<TeamStatsData | null>({
    queryKey: ['team-stats', teamId],
    queryFn: async () => {
      const base = getApiBaseUrl()
      const res = await fetchWithRetry<{ success: boolean; data: TeamStatsData }>(
        `${base}/api/stats/teams/${teamId}`
      )
      return res.data
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 10,
  })
}

export { useTeamForm } from './use-match-detail'
export type { TeamFormData }
