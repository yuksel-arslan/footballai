'use client'

import { useQuery } from '@tanstack/react-query'

export interface TeamHistory {
  team: { id: number; name: string; logoUrl?: string | null }
  played: number
  wins: number
  draws: number
  losses: number
  winRate: number
  goalsFor: number
  goalsAgainst: number
  avgGoalsFor: number
  avgGoalsAgainst: number
  cleanSheets: number
  failedToScore: number
  bttsRate: number
  form: ('W' | 'D' | 'L')[]
  recent: {
    id: number
    result: 'W' | 'D' | 'L'
    gf: number
    ga: number
    isHome: boolean
    opponent: string
    opponentLogo?: string | null
    matchDate: string
    league: string
  }[]
}

/**
 * Historical stats for a team, derived from finished fixtures. Resolved by
 * NAME (reliable across providers); the numeric id is only a fallback.
 */
export function useTeamHistory(teamId: number | undefined, teamName?: string) {
  return useQuery<TeamHistory | null>({
    queryKey: ['team-history', teamName ?? teamId],
    enabled: !!teamId || !!teamName,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const q = teamName ? `?name=${encodeURIComponent(teamName)}` : ''
      const res = await fetch(`/api/stats/teams/${teamId ?? 0}/history${q}`)
      if (!res.ok) return null
      const json = await res.json()
      return json?.data ?? null
    },
  })
}
