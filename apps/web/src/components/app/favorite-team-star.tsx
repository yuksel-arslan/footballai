'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import {
  STORAGE_KEY_TEAMS,
  type FavTeam,
  loadLocal,
  saveLocal,
  useServerFavoriteTeams,
  mutateServerFavorite,
  useInvalidateFavorites,
} from '@/hooks/use-favorites'

/** Follow/unfollow star for a team — writes the account favorites (and the
 * local fallback for guests), feeding the Favoriler page. */
export function FavoriteTeamStar({
  teamApiId,
  name,
  logoUrl,
  league,
}: {
  teamApiId: number
  name: string
  logoUrl?: string
  league?: string
}) {
  const authed = useAuthStore((s) => s.isAuthenticated)
  const serverTeams = useServerFavoriteTeams()
  const invalidate = useInvalidateFavorites()
  const [localOn, setLocalOn] = useState(false)
  const [override, setOverride] = useState<boolean | null>(null)

  useEffect(() => {
    setLocalOn(
      loadLocal<FavTeam>(STORAGE_KEY_TEAMS).some(
        (t) => t.name.toLowerCase() === name.toLowerCase()
      )
    )
  }, [name])

  const serverOn = (serverTeams.data ?? []).some(
    (t) => t.apiId === teamApiId || t.name.toLowerCase() === name.toLowerCase()
  )
  const on = override ?? (localOn || serverOn)

  const toggle = async () => {
    const next = !on
    setOverride(next)
    const list = loadLocal<FavTeam>(STORAGE_KEY_TEAMS).filter(
      (t) => t.name.toLowerCase() !== name.toLowerCase()
    )
    saveLocal(
      STORAGE_KEY_TEAMS,
      next ? [...list, { id: String(teamApiId), name, logoUrl, league }] : list
    )
    setLocalOn(next)
    if (authed) {
      const ok = await mutateServerFavorite('teams', teamApiId, next)
      if (ok) invalidate('teams')
    }
  }

  return (
    <button
      onClick={toggle}
      title={on ? 'Favorilerden çıkar' : 'Favorilere ekle'}
      aria-pressed={on}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-card hover:bg-muted/40 transition-colors text-xs font-medium"
    >
      <Star
        size={15}
        fill={on ? '#00E07A' : 'none'}
        color={on ? '#00E07A' : 'currentColor'}
      />
      {on ? 'Takiptesin' : 'Takip et'}
    </button>
  )
}
