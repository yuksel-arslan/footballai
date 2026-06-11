'use client'

import { useState } from 'react'
import type { Fixture, League } from '@/lib/api'
import {
  useLiveFixtures,
  useUpcomingFixtures,
  useFinishedFixtures,
  useActiveLeagues,
} from '@/hooks/use-fixtures'
import { MatchRow } from '@/components/app/match-row'
import { useFormBatch } from '@/hooks/use-form-batch'
import { useValueBets } from '@/hooks/use-value-bets'
import { normalizeTeam, canonicalTeam } from '@/lib/team-name'
import { formatLongDate } from '@/lib/format'

type Tab = 'live' | 'upcoming' | 'finished'

// National-team competitions are always in spirit during their window and may
// be named differently across providers — always allow them through the
// active-league filter. NOTE: `euro(?!pa)` matches the European Championship
// but NOT the UEFA Europa/Conference League (club cups must pass the active
// check like any other competition).
const INTL_LEAGUE_RE =
  /world cup|d[üu]nya kupas|euro(?!pa)|nations league|copa am[eé]rica|africa cup|afcon|asian cup|qualif|eleme|friendl|haz[ıi]rl[ıi]k|international|milli/i

const normLeague = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

function groupByLeague(
  fixtures: Fixture[]
): { league: League; items: Fixture[] }[] {
  const map = new Map<number, { league: League; items: Fixture[] }>()
  for (const f of fixtures) {
    const key = f.league?.id ?? -1
    const bucket = map.get(key)
    if (bucket) bucket.items.push(f)
    else map.set(key, { league: f.league, items: [f] })
  }
  return [...map.values()]
}

function LeagueHead({ league, count }: { league: League; count: number }) {
  return (
    <div className="lg-head">
      {league?.logoUrl ? (
        <img
          className="flag"
          src={league.logoUrl}
          alt=""
          style={{
            width: 22,
            height: 16,
            objectFit: 'contain',
            boxShadow: 'none',
          }}
        />
      ) : (
        <span className="flag" style={{ background: 'var(--raise)' }} />
      )}
      <span className="nm">{league?.name ?? 'Lig'}</span>
      <span className="ct">{count} maç</span>
    </div>
  )
}

export default function MatchesPage() {
  const [tab, setTab] = useState<Tab>('upcoming')
  const live = useLiveFixtures()
  const upcoming = useUpcomingFixtures()
  const finished = useFinishedFixtures()

  const active =
    tab === 'live' ? live : tab === 'finished' ? finished : upcoming

  // The spirit of the day = the competitions that are actually running right
  // now. Live matches are already the source of truth; a finished match
  // belongs in the list only if its competition is one we're currently
  // following (live or upcoming), plus the calendar-active set as backup.
  // This makes "Biten" simply the live/upcoming competitions whose matches
  // have ended — no off-season league or stray UEFA tie leaks in.
  const { data: activeLeagues } = useActiveLeagues()
  const activeNames = new Set(activeLeagues?.names ?? [])
  const activeApiIds = new Set(activeLeagues?.apiIds ?? [])

  // League keys present in the live + upcoming slates (what's in play today).
  const runningLeagueIds = new Set<number>()
  const runningLeagueNames = new Set<string>()
  for (const f of [...(live.data ?? []), ...(upcoming.data ?? [])]) {
    if (f.league?.id != null) runningLeagueIds.add(f.league.id)
    if (f.league?.name) runningLeagueNames.add(normLeague(f.league.name))
  }

  const rawFixtures = active.data ?? []
  const isActiveFixture = (f: Fixture): boolean => {
    const name = f.league?.name ?? ''
    const norm = normLeague(name)
    // Same competition as something currently live/upcoming.
    if (f.league?.id != null && runningLeagueIds.has(f.league.id)) return true
    if (runningLeagueNames.has(norm)) return true
    // National-team tournaments (provider names vary) always pass.
    if (INTL_LEAGUE_RE.test(name)) return true
    // Calendar-active backup.
    if (f.league?.id != null && activeApiIds.has(f.league.id)) return true
    return activeNames.has(norm)
  }
  // Fail open only when we have NO signal at all (active set empty AND nothing
  // running) — otherwise an empty list is a legitimate, honest state.
  const haveSignal =
    activeNames.size > 0 ||
    runningLeagueIds.size > 0 ||
    runningLeagueNames.size > 0
  const fixtures = haveSignal
    ? rawFixtures.filter(isActiveFixture)
    : rawFixtures
  const groups = groupByLeague(fixtures)

  // One batched request for the recent form of every team on screen, so the
  // list shows a historical summary without a request per row. Resolved by
  // name (ids from the feed may be foreign-provider).
  const teamNames = fixtures.flatMap((f) => [
    f.homeTeam?.name,
    f.awayTeam?.name,
  ])
  const { data: forms } = useFormBatch(teamNames.filter(Boolean) as string[])

  // Surface the cached value-bet engine's odds on the list — zero extra API
  // cost (reads the precomputed cache). Joined by canonical team names since
  // the list and the engine may use different providers' ids.
  const { data: vb } = useValueBets()
  const valueByMatch = new Map(
    (vb?.items ?? []).map((v) => [
      `${canonicalTeam(v.home)}|${canonicalTeam(v.away)}`,
      v,
    ])
  )
  const valueFor = (f: (typeof fixtures)[number]) => {
    if (!f.homeTeam?.name || !f.awayTeam?.name) return undefined
    const hit = valueByMatch.get(
      `${canonicalTeam(f.homeTeam.name)}|${canonicalTeam(f.awayTeam.name)}`
    )
    return hit
      ? { pickLabel: hit.pickLabel, odds: hit.odds, evPerUnit: hit.evPerUnit }
      : undefined
  }

  // Full 1X2 market odds for every priced fixture (value or not).
  const oddsByMatch = new Map(
    (vb?.odds ?? []).map((o) => [
      `${canonicalTeam(o.home)}|${canonicalTeam(o.away)}`,
      o.odds,
    ])
  )
  const oddsFor = (f: (typeof fixtures)[number]) =>
    f.homeTeam?.name && f.awayTeam?.name
      ? oddsByMatch.get(
          `${canonicalTeam(f.homeTeam.name)}|${canonicalTeam(f.awayTeam.name)}`
        )
      : undefined

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Maçlar</h1>
          <div className="sub" style={{ marginTop: 4 }}>
            {formatLongDate()} · tüm büyük ligler
          </div>
        </div>
        <div className="right seg">
          <button
            className={tab === 'live' ? 'on' : ''}
            onClick={() => setTab('live')}
          >
            Canlı
            {live.data && live.data.length > 0 ? ` (${live.data.length})` : ''}
          </button>
          <button
            className={tab === 'upcoming' ? 'on' : ''}
            onClick={() => setTab('upcoming')}
          >
            Yaklaşan
          </button>
          <button
            className={tab === 'finished' ? 'on' : ''}
            onClick={() => setTab('finished')}
          >
            Biten
          </button>
        </div>
      </div>

      {active.isLoading ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Maçlar yükleniyor…
          </p>
        </div>
      ) : groups.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            {tab === 'live'
              ? 'Şu an canlı maç yok.'
              : tab === 'finished'
                ? 'Yakın zamanda biten maç bulunamadı.'
                : 'Yaklaşan maç bulunamadı.'}
          </p>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.league?.id ?? g.league?.name}>
            <LeagueHead league={g.league} count={g.items.length} />
            {g.items.map((f) => (
              <MatchRow
                key={f.id}
                fixture={f}
                homeForm={
                  f.homeTeam?.name
                    ? forms?.[normalizeTeam(f.homeTeam.name)]
                    : undefined
                }
                awayForm={
                  f.awayTeam?.name
                    ? forms?.[normalizeTeam(f.awayTeam.name)]
                    : undefined
                }
                value={valueFor(f)}
                marketOdds={oddsFor(f)}
              />
            ))}
          </div>
        ))
      )}
    </div>
  )
}
