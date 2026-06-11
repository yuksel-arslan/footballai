'use client'

import { useQuery } from '@tanstack/react-query'

export interface FeaturedPrediction {
  fixtureId: number
  home: string
  away: string
  homeLogo?: string | null
  awayLogo?: string | null
  league: string
  matchDate: string
  pick: 'home' | 'draw' | 'away'
  pickLabel: string
  prob: number
  confidence: number | null
  source: 'model' | 'form'
}

export interface FeaturedPayload {
  featured: FeaturedPrediction | null
  predictedCount: number
}

/**
 * Free home-page featured pick + count of upcoming fixtures that already
 * have a stored prediction. Reads the DB (no AI, no credits).
 */
export function useFeatured() {
  return useQuery<FeaturedPayload>({
    queryKey: ['featured'],
    queryFn: async () => {
      const res = await fetch('/api/predictions/featured')
      const json = await res.json().catch(() => null)
      return json?.data ?? { featured: null, predictedCount: 0 }
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: { featured: null, predictedCount: 0 },
  })
}
