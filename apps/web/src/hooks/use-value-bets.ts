'use client'

import { useQuery } from '@tanstack/react-query'

export interface ValueBetItem {
  fixtureId: number
  league: { id: number; name: string }
  home: string
  away: string
  matchDate: string
  selection: 'home' | 'draw' | 'away'
  pickLabel: string
  odds: number
  modelProb: number
  marketProb: number
  edge: number
  evPerUnit: number
  recKelly: number
  probs: { home: number; draw: number; away: number }
}

export interface ValueBetsPayload {
  updatedAt: string | null
  items: ValueBetItem[]
}

/** Pre-computed value bets (ranked by edge). Cheap — reads the server cache. */
export function useValueBets() {
  return useQuery<ValueBetsPayload>({
    queryKey: ['value-bets'],
    queryFn: async () => {
      const res = await fetch('/api/predictions/value-bets')
      const json = await res.json().catch(() => null)
      return json?.data ?? { updatedAt: null, items: [] }
    },
    staleTime: 1000 * 60 * 10,
    placeholderData: { updatedAt: null, items: [] },
  })
}
