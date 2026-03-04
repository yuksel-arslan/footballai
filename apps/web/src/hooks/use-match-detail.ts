'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { getApiBaseUrl } from '@/lib/env'

interface Team {
  id: number
  name: string
  logoUrl?: string
  code?: string
}

interface League {
  id: number
  name: string
  country: string
  logoUrl?: string
}

export interface MatchDetail {
  id: number
  apiId: number
  homeTeam: Team
  awayTeam: Team
  league: League
  matchDate: string
  status: 'SCHEDULED' | 'LIVE' | 'HALFTIME' | 'FINISHED' | 'POSTPONED' | 'CANCELLED'
  homeScore?: number | null
  awayScore?: number | null
  venue?: string
  referee?: string
  round?: string
  minute?: number | null
  predictions?: Array<{
    homeWinProb: number
    drawProb: number
    awayWinProb: number
    predictedHomeScore: number
    predictedAwayScore: number
    confidence: number
    explanation?: string
    keyFactors?: Array<{ factor: string; impact: number; description: string }>
    modelVersion: string
  }>
}

interface H2HSummary {
  team1Wins: number
  team2Wins: number
  draws: number
  totalGames: number
}

interface H2HMatch {
  id: number
  homeTeam: Team
  awayTeam: Team
  homeScore?: number | null
  awayScore?: number | null
  matchDate: string
  status: string
  league: { id: number; name: string }
}

export interface H2HData {
  summary: H2HSummary | null
  history: H2HMatch[]
}

export interface TeamFormData {
  form: string[]
  matches: Array<{
    id: number
    homeTeam: Team
    awayTeam: Team
    homeScore?: number | null
    awayScore?: number | null
    matchDate: string
    status: string
    league: { id: number; name: string }
  }>
}

export function useMatchDetail(fixtureId: number) {
  return useQuery<MatchDetail | null>({
    queryKey: ['match-detail', fixtureId],
    queryFn: async () => {
      const base = getApiBaseUrl()
      const res = await fetchWithRetry<{ success: boolean; data: MatchDetail }>(
        `${base}/api/fixtures/${fixtureId}`
      )
      return res.data
    },
    enabled: !!fixtureId,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  })
}

export function useH2H(team1Id: number, team2Id: number) {
  return useQuery<H2HData>({
    queryKey: ['h2h', team1Id, team2Id],
    queryFn: async () => {
      const base = getApiBaseUrl()
      const res = await fetchWithRetry<{ success: boolean; data: H2HData }>(
        `${base}/api/stats/h2h/${team1Id}/${team2Id}`
      )
      return res.data
    },
    enabled: !!team1Id && !!team2Id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  })
}

export function useTeamForm(teamId: number) {
  return useQuery<TeamFormData>({
    queryKey: ['team-form', teamId],
    queryFn: async () => {
      const base = getApiBaseUrl()
      const res = await fetchWithRetry<{ success: boolean; data: TeamFormData }>(
        `${base}/api/stats/teams/${teamId}/form`
      )
      return res.data
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  })
}
