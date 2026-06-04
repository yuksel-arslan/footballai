'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { LEAGUES } from '@/lib/api'
import { useUpcomingFixtures } from '@/hooks/use-fixtures'
import { MatchRow } from '@/components/app/match-row'
import { Crest } from '@/components/app/crest'

const STORAGE_KEY_TEAMS = 'favorite-teams'
const STORAGE_KEY_LEAGUES = 'favorite-leagues'

interface FavTeam {
  id: string
  name: string
  code?: string
  logoUrl?: string
  league?: string
  leagueCode?: string
}

function load<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const s = localStorage.getItem(key)
    return s ? (JSON.parse(s) as T[]) : []
  } catch {
    return []
  }
}

const leagueList = Object.entries(LEAGUES).map(([code, l]) => ({ code, ...l }))

export default function FavoritesPage() {
  const [teams, setTeams] = useState<FavTeam[]>([])
  const [leagues, setLeagues] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  const { data: upcoming = [] } = useUpcomingFixtures()

  useEffect(() => {
    setTeams(load<FavTeam>(STORAGE_KEY_TEAMS))
    setLeagues(load<string>(STORAGE_KEY_LEAGUES))
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(teams))
  }, [teams, loaded])
  useEffect(() => {
    if (loaded)
      localStorage.setItem(STORAGE_KEY_LEAGUES, JSON.stringify(leagues))
  }, [leagues, loaded])

  const removeTeam = (id: string) =>
    setTeams((t) => t.filter((x) => x.id !== id))
  const toggleLeague = (code: string) =>
    setLeagues((l) =>
      l.includes(code) ? l.filter((c) => c !== code) : [...l, code]
    )

  const favNames = new Set(teams.map((t) => t.name.toLowerCase()))
  const favMatches = upcoming
    .filter(
      (f) =>
        favNames.has(f.homeTeam.name.toLowerCase()) ||
        favNames.has(f.awayTeam.name.toLowerCase())
    )
    .slice(0, 6)

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
                    onClick={() => removeTeam(team.id)}
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
                Henüz favori takımın yok. Bir takımın sayfasından favorilere
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
                Favori takımlarının yaklaşan maçı bulunmuyor.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: leagues with toggles */}
        <div className="card">
          <div className="card-h">
            <h3>Liglerin</h3>
            <span className="hint">{leagues.length} takip</span>
          </div>
          <div className="leaguelist">
            {leagueList.map((l) => {
              const on = leagues.includes(l.code)
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
