'use client'

import { useState } from 'react'
import type { Fixture, League } from '@/lib/api'
import {
  useLiveFixtures,
  useUpcomingFixtures,
  useFinishedFixtures,
} from '@/hooks/use-fixtures'
import { MatchRow } from '@/components/app/match-row'
import { formatLongDate } from '@/lib/format'

type Tab = 'live' | 'upcoming' | 'finished'

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
  const groups = groupByLeague(active.data ?? [])

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
              <MatchRow key={f.id} fixture={f} />
            ))}
          </div>
        ))
      )}
    </div>
  )
}
