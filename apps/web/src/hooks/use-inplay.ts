'use client'

import { useQuery } from '@tanstack/react-query'

export interface InPlayResult {
  live: boolean
  status: string
  homeScore: number | null
  awayScore: number | null
  minute: number | null
  summary: string | null
  homeWinProb?: number | null
  drawProb?: number | null
  awayWinProb?: number | null
  projectedScore?: string | null
}

/**
 * In-play ("maç arası") read for a fixture. Public/free; refetches while the
 * match is live so the note tracks the evolving score.
 */
export function useInPlay(fixtureId: number, enabled: boolean) {
  return useQuery<InPlayResult | null>({
    queryKey: ['inplay', fixtureId],
    enabled: enabled && Number.isFinite(fixtureId),
    staleTime: 60 * 1000,
    refetchInterval: (q) =>
      (q.state.data as InPlayResult | null)?.live ? 90 * 1000 : false,
    queryFn: async () => {
      const res = await fetch(`/api/matches/${fixtureId}/inplay`)
      if (res.status === 404) return null
      if (!res.ok) throw new Error('inplay_failed')
      const json = (await res.json()) as { data?: InPlayResult }
      return json.data ?? null
    },
  })
}
