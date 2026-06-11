'use client'

import { useQuery } from '@tanstack/react-query'
import { normalizeTeam } from '@/lib/team-name'

/** Form keyed by normalized team name. Look up with normalizeTeam(name). */
export type FormMap = Record<string, ('W' | 'D' | 'L')[]>

/**
 * Last-5 form for many teams in a single request, resolved by name. Pass all
 * visible team names; the matches list uses this instead of per-row fetches.
 * Look up a team's form with `forms[normalizeTeam(team.name)]`.
 */
export function useFormBatch(teamNames: string[]) {
  const names = [...new Set(teamNames.filter(Boolean))].sort()
  const key = names.join('|')
  return useQuery<FormMap>({
    queryKey: ['form-batch', key],
    enabled: names.length > 0,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const res = await fetch(
        `/api/stats/teams/form-batch?names=${encodeURIComponent(names.join(','))}`
      )
      if (!res.ok) return {}
      const json = await res.json()
      return (json?.data ?? {}) as FormMap
    },
  })
}

export { normalizeTeam }
