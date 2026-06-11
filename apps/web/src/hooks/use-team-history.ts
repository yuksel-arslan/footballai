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

/** Historical stats for a team, derived from finished fixtures. */
export function useTeamHistory(teamId: number | undefined) {
  return useQuery<TeamHistory | null>({
    queryKey: ['team-history', teamId],
    enabled: !!teamId,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const res = await fetch(`/api/stats/teams/${teamId}/history`)
      if (!res.ok) return null
      const json = await res.json()
      return json?.data ?? null
    },
  })
}
