'use client'

import { useQuery } from '@tanstack/react-query'

export interface MatchReportData {
  homeScore: number
  awayScore: number
  outcome: 'home' | 'draw' | 'away'
  home: string
  away: string
  league: string
  matchDate: string
  prediction: {
    existed: boolean
    pick?: 'home' | 'draw' | 'away'
    pickLabel?: string
    correct?: boolean
    probOnActual?: number
    predictedScore?: string
    confidence?: number
  }
  takeaways: string[]
}

export interface MatchReport {
  id: number
  fixtureId: number
  summary: string
  data: MatchReportData
  createdAt: string
}

/** Post-match report for a finished fixture (auto-generated server-side). */
export function useMatchReport(fixtureId: number, enabled: boolean) {
  return useQuery<MatchReport | null>({
    queryKey: ['match-report', fixtureId],
    enabled: enabled && Number.isFinite(fixtureId),
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/matches/${fixtureId}/report`)
      if (res.status === 404) return null
      if (!res.ok) throw new Error('report_failed')
      const json = (await res.json()) as { data?: MatchReport }
      return json.data ?? null
    },
  })
}
