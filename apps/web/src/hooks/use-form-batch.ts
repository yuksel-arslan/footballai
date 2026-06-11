'use client'

import { useQuery } from '@tanstack/react-query'

export type FormMap = Record<number, ('W' | 'D' | 'L')[]>

/**
 * Last-5 form for many teams in a single request. Pass all visible team
 * (API-Football) ids; the matches list uses this instead of per-row fetches.
 */
export function useFormBatch(teamIds: number[]) {
  const ids = [...new Set(teamIds.filter(Boolean))].sort((a, b) => a - b)
  const key = ids.join(',')
  return useQuery<FormMap>({
    queryKey: ['form-batch', key],
    enabled: ids.length > 0,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const res = await fetch(`/api/stats/teams/form-batch?ids=${key}`)
      if (!res.ok) return {}
      const json = await res.json()
      return (json?.data ?? {}) as FormMap
    },
  })
}
