'use client'

import { useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'
import { LEAGUES } from '@/lib/api'
import { useUpcomingFixtures } from '@/hooks/use-fixtures'
import { useAuthStore } from '@/stores/auth.store'
import {
  STORAGE_KEY_TEAMS,
  STORAGE_KEY_LEAGUES,
  type FavTeam,
  loadLocal,
  saveLocal,
  useServerFavoriteLeagues,
  useServerFavoriteTeams,
  mutateServerFavorite,
  useInvalidateFavorites,
} from '@/hooks/use-favorites'
import { MatchRow } from '@/components/app/match-row'
import { Crest } from '@/components/app/crest'

const leagueList = Object.entries(LEAGUES).map(([code, l]) => ({ code, ...l }))
const codeByApiId = new Map(leagueList.map((l) => [l.apiId, l.code]))

export default function FavoritesPage() {
  const authed = useAuthStore((s) => s.isAuthenticated)

  // Local (guest / not-yet-ingested fallback) state
  const [localTeams, setLocalTeams] = useState<FavTeam[]>([])
  const [localLeagues, setLocalLeagues] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  // Account-backed state
  const serverLeagues = useServerFavoriteLeagues()
  const serverTeams = useServerFavoriteTeams()
  const invalidate = useInvalidateFavorites()
  const migrated = useRef(false)

  const { data: upcoming = [] } = useUpcomingFixtures()

  useEffect(() => {
    setLocalTeams(loadLocal<FavTeam>(STORAGE_KEY_TEAMS))
    setLocalLeagues(loadLocal<string>(STORAGE_KEY_LEAGUES))
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) saveLocal(STORAGE_KEY_TEAMS, localTeams)
  }, [localTeams, loaded])
  useEffect(() => {
    if (loaded) saveLocal(STORAGE_KEY_LEAGUES, localLeagues)
  }, [localLeagues, loaded])

  // One-time migration: locally collected favorites move onto the account the
  // first time we see an authenticated, empty server list.
  useEffect(() => {
    if (!authed || migrated.current) return
    if (!serverLeagues.isSuccess || !serverTeams.isSuccess || !loaded) return
    migrated.current = true
    const work: Promise<boolean>[] = []
    if (serverLeagues.data.length === 0) {
      for (const code of localLeagues) {
        const l = LEAGUES[code]
        if (l) work.push(mutateServerFavorite('leagues', l.apiId, true))
      }
    }
    if (serverTeams.data.length === 0) {
      for (const t of localTeams) {
        const apiId = Number(t.id)
        if (Number.isFinite(apiId) && apiId !== 0)
          work.push(mutateServerFavorite('teams', apiId, true))
      }
    }
    if (work.length > 0) {
      Promise.allSettled(work).then(() => {
        invalidate('leagues')
        invalidate('teams')
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, serverLeagues.isSuccess, serverTeams.isSuccess, loaded])

  // Display state = server ∪ local
  const serverLeagueCodes = new Set(
    (serverLeagues.data ?? [])
      .map((l) => codeByApiId.get(l.apiId))
      .filter((c): c is string => !!c)
  )
  const activeLeagueCodes = new Set([...serverLeagueCodes, ...localLeagues])

  const serverTeamList: FavTeam[] = (serverTeams.data ?? []).map((t) => ({
    id: String(t.apiId),
    name: t.name,
    logoUrl: t.logoUrl ?? undefined,
    league: t.league ?? undefined,
  }))
  const seen = new Set(serverTeamList.map((t) => t.name.toLowerCase()))
  const teams = [
    ...serverTeamList,
    ...localTeams.filter((t) => !seen.has(t.name.toLowerCase())),
  ]

  const toggleLeague = async (code: string) => {
    const on = !activeLeagueCodes.has(code)
    const league = LEAGUES[code]
    // optimistic local flip so the switch answers instantly
    setLocalLeagues((l) =>
      on ? [...new Set([...l, code])] : l.filter((c) => c !== code)
    )
    if (authed && league) {
      const ok = await mutateServerFavorite('leagues', league.apiId, on)
      if (ok) invalidate('leagues')
    }
  }

  const removeTeam = async (team: FavTeam) => {
    setLocalTeams((t) => t.filter((x) => x.id !== team.id))
    const apiId = Number(team.id)
    if (authed && Number.isFinite(apiId) && apiId !== 0) {
      const ok = await mutateServerFavorite('teams', apiId, false)
      if (ok) invalidate('teams')
    }
  }

  // Upcoming matches of favorite TEAMS and favorite LEAGUES (league.id in the
  // converted fixture is the provider apiId — same space as LEAGUES.apiId).
  const favNames = new Set(teams.map((t) => t.name.toLowerCase()))
  const favLeagueApiIds = new Set(
    [...activeLeagueCodes]
      .map((c) => LEAGUES[c]?.apiId)
      .filter((n): n is number => typeof n === 'number')
  )
  const favMatches = upcoming
    .filter(
      (f) =>
        favNames.has(f.homeTeam.name.toLowerCase()) ||
        favNames.has(f.awayTeam.name.toLowerCase()) ||
        (f.league?.id != null && favLeagueApiIds.has(f.league.id))
    )
    .slice(0, 8)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Favoriler</h1>
          <div className="sub" style={{ marginTop: 4 }}>
            Takip ettiğin takımlar ve ligler — fırsatlar önce sana gelir
          </div>
        </div>
      </div>

      {!authed && loaded && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Favorilerin şu an bu cihazda saklanıyor.{' '}
            <a href="/login" style={{ color: 'var(--c1, #10b981)' }}>
              Giriş yap
            </a>
            , hesabına kaydedilsin ve her cihazda seninle gelsin.
          </p>
        </div>
      )}

      <div className="cols2">
        {/* LEFT: teams + their matches */}
        <div>
          <div className="section-h">
            <h2>Takımların</h2>
            <span className="ct">{teams.length} takip</span>
          </div>

          {teams.length > 0 ? (
            <div className="teamgrid">
              {teams.map((team) => (
                <div className="tfav" key={team.id}>
                  <button
                    onClick={() => removeTeam(team)}
                    title="Favorilerden çıkar"
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      background: 'none',
                      border: 0,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <Star
                      className="star"
                      size={16}
                      fill="#00E07A"
                      color="#00E07A"
                    />
                  </button>
                  <div style={{ margin: '0 auto', width: 44 }}>
                    <Crest
                      team={{ id: 0, name: team.name, logoUrl: team.logoUrl }}
                      size="md"
                    />
                  </div>
                  <div className="nm">{team.name}</div>
                  <div className="sub">{team.league ?? ''}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card">
              <p className="muted" style={{ margin: 0 }}>
                Bir takımın sayfasındaki yıldıza dokunarak onu buraya
                ekleyebilirsin.
              </p>
            </div>
          )}

          <div className="section-h" style={{ marginTop: 28 }}>
            <h2>Yaklaşan favori maçların</h2>
          </div>
          {favMatches.length > 0 ? (
            favMatches.map((f) => <MatchRow key={f.id} fixture={f} />)
          ) : (
            <div className="card">
              <p className="muted" style={{ margin: 0 }}>
                Takım veya lig seçtiğinde yaklaşan maçlar burada listelenir.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: leagues with toggles */}
        <div className="card">
          <div className="card-h">
            <h3>Liglerin</h3>
            <span className="hint">{activeLeagueCodes.size} takip</span>
          </div>
          <div className="leaguelist">
            {leagueList.map((l) => {
              const on = activeLeagueCodes.has(l.code)
              return (
                <div className="lrow" key={l.code}>
                  {l.logoUrl ? (
                    <img
                      className="flag"
                      src={l.logoUrl}
                      alt=""
                      style={{
                        width: 24,
                        height: 17,
                        objectFit: 'contain',
                        boxShadow: 'none',
                      }}
                    />
                  ) : (
                    <span
                      className="flag"
                      style={{ background: 'var(--raise)' }}
                    />
                  )}
                  <div>
                    <div className="nm">{l.name}</div>
                    <div className="st">{l.country}</div>
                  </div>
                  <div className="right">
                    <button
                      className={`tg${on ? ' on' : ''}`}
                      aria-pressed={on}
                      aria-label={`${l.name} takip`}
                      onClick={() => toggleLeague(l.code)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
