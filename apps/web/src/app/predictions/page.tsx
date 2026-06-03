'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useValueBets, type ValueBetItem } from '@/hooks/use-value-bets'
import { Crest } from '@/components/app/crest'
import { formatTime, formatDayLabel } from '@/lib/format'
import type { Team } from '@/lib/api'

function teamStub(name: string): Team {
  return { id: 0, name }
}

function signedPct(fraction: number): string {
  const v = fraction * 100
  return `${v >= 0 ? '+' : ''}%${v.toFixed(1)}`
}

function Row({ item, rank }: { item: ValueBetItem; rank: number }) {
  return (
    <Link className="rrow" href={`/matches/${item.fixtureId}`}>
      <span className={`rank${rank <= 3 ? ' top' : ''}`}>{rank}</span>
      <div className="fx">
        <div className="lg">
          {item.league.name} · {formatDayLabel(item.matchDate)}{' '}
          {formatTime(item.matchDate)}
        </div>
        <div className="tm">
          <Crest team={teamStub(item.home)} />
          <span className="nm">{item.home}</span>
          <span className="vs">-</span>
          <span className="nm">{item.away}</span>
        </div>
      </div>
      <div className="pk">
        <div className="l">Tahmin</div>
        <div className="v">
          {item.pickLabel} <span className="odds">@{item.odds.toFixed(2)}</span>
        </div>
      </div>
      <div className="ev">
        <div className="l">Beklenen Değer</div>
        <div className="v pos">{signedPct(item.evPerUnit)}</div>
      </div>
      <div className="edgecell">
        <span className="edge-pill">{signedPct(item.edge)}</span>
      </div>
    </Link>
  )
}

export default function ValueBetsPage() {
  const { data, isLoading } = useValueBets()
  const items = data?.items ?? []
  const [league, setLeague] = useState<string>('all')

  const leagues = useMemo(
    () => Array.from(new Set(items.map((i) => i.league.name))),
    [items]
  )
  const filtered =
    league === 'all' ? items : items.filter((i) => i.league.name === league)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">AI · Değer Motoru</div>
          <h1 style={{ marginTop: 6 }}>Değerli bahisler</h1>
          <div className="sub" style={{ marginTop: 4 }}>
            Modelin olasılığı piyasanın ima ettiğini geçtiğinde fırsat doğar.
            Bugün <b style={{ color: 'var(--txt)' }}>{items.length} fırsat</b>,
            avantaja göre sıralı.
          </div>
        </div>
      </div>

      {leagues.length > 0 && (
        <div className="filters">
          <span
            className={`chip${league === 'all' ? ' on' : ''}`}
            onClick={() => setLeague('all')}
          >
            Tüm ligler
          </span>
          {leagues.map((l) => (
            <span
              key={l}
              className={`chip${league === l ? ' on' : ''}`}
              onClick={() => setLeague(l)}
            >
              {l}
            </span>
          ))}
          <span className="sp" />
          <span className="chip on">Min. avantaj %3</span>
        </div>
      )}

      {isLoading ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Yükleniyor…
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Şu an listelenecek değerli bahis yok. Değer motoru yaklaşan maçlar
            için oran ve model olasılığını karşılaştırdığında fırsatlar burada
            görünür.
          </p>
        </div>
      ) : (
        <div className="ranklist">
          {filtered.map((item, i) => (
            <Row key={item.fixtureId} item={item} rank={i + 1} />
          ))}
        </div>
      )}

      <div
        className="card tight"
        style={{
          marginTop: 22,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <span className="disc">
          Avantaj = model olasılığı − piyasa ima olasılığı. Yalnızca pozitif
          beklenen değerli (+EV) seçimler listelenir. Oranlar referans
          amaçlıdır. 18+ · Sorumlu oyna.
        </span>
      </div>
    </div>
  )
}
