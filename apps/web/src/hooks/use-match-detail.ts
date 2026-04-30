'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

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
  status:
    | 'SCHEDULED'
    | 'LIVE'
    | 'HALFTIME'
    | 'FINISHED'
    | 'POSTPONED'
    | 'CANCELLED'
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
      const fixture = await api.getFixtureById(fixtureId)
      if (!fixture) return null
      return fixture as MatchDetail
    },
    enabled: !!fixtureId,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    // Auto-refresh while a match is in play. Backend's lazy updater holds a
    // 60s cooldown, so polling at 30s costs at most one upstream API call
    // per minute regardless of how many viewers are watching.
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'LIVE' || status === 'HALFTIME' ? 30_000 : false
    },
    refetchIntervalInBackground: false,
  })
}

export function useH2H(team1Id: number, team2Id: number) {
  return useQuery<H2HData>({
    queryKey: ['h2h', team1Id, team2Id],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/stats/h2h/${team1Id}/${team2Id}`, {
          signal: AbortSignal.timeout(15000),
        })
        if (!res.ok) return { summary: null, history: [] }
        const json = await res.json()
        return json.data || { summary: null, history: [] }
      } catch {
        return { summary: null, history: [] }
      }
    },
    enabled: !!team1Id && !!team2Id,
    retry: 1,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  })
}

export interface TeamMatchStats {
  teamId: number
  teamName: string
  teamLogo?: string
  possession?: string
  shotsTotal?: number
  shotsOnTarget?: number
  corners?: number
  fouls?: number
  yellowCards?: number
  redCards?: number
  offsides?: number
  passes?: number
  passAccuracy?: string
  tackles?: number
  interceptions?: number
  saves?: number
  expectedGoals?: string
}

export interface MatchStatsData {
  home: TeamMatchStats | null
  away: TeamMatchStats | null
}

export function useMatchStats(fixtureId: number) {
  return useQuery<MatchStatsData>({
    queryKey: ['match-stats', fixtureId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/stats/fixtures/${fixtureId}`, {
          signal: AbortSignal.timeout(10000),
        })
        if (!res.ok) return { home: null, away: null }
        const json = await res.json()
        return json.data || { home: null, away: null }
      } catch {
        return { home: null, away: null }
      }
    },
    enabled: !!fixtureId,
    retry: 1,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  })
}

export function useTeamForm(teamId: number) {
  return useQuery<TeamFormData>({
    queryKey: ['team-form', teamId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/stats/teams/${teamId}/form`, {
          signal: AbortSignal.timeout(15000),
        })
        if (!res.ok) return { form: [], matches: [] }
        const json = await res.json()
        return json.data || { form: [], matches: [] }
      } catch {
        return { form: [], matches: [] }
      }
    },
    enabled: !!teamId,
    retry: 1,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  })
}
