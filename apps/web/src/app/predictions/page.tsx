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

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const mins = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  )
  if (mins < 1) return 'az önce'
  if (mins < 60) return `${mins} dk önce`
  const h = Math.round(mins / 60)
  return `${h} sa önce`
}

function Row({ item, rank }: { item: ValueBetItem; rank: number }) {
  const modelPct = Math.round(item.modelProb * 100)
  const marketPct = Math.round(item.marketProb * 100)
  const stakePct = (item.recKelly * 100).toFixed(1)
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
          <Crest team={teamStub(item.away)} />
        </div>
      </div>

      <div className="pk">
        <div className="l">Tahmin</div>
        <div className="v">
          {item.pickLabel} <span className="odds">@{item.odds.toFixed(2)}</span>
        </div>
      </div>

      <div className="prob">
        <div className="l">Model · Piyasa</div>
        <div className="v">
          <b className="pos">%{modelPct}</b> · %{marketPct}
        </div>
        <div className="dual">
          <span className="m" style={{ width: `${modelPct}%` }} />
          <span className="mk" style={{ width: `${marketPct}%` }} />
        </div>
      </div>

      <div className="stake">
        <div className="l">Önerilen ağırlık</div>
        <div className="v">%{stakePct}</div>
      </div>

      <div className="ev">
        <div className="l">Beklenen değer</div>
        <div className="v pos">{signedPct(item.evPerUnit)}</div>
        <span className="edge-pill sm">{signedPct(item.edge)} avantaj</span>
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

  const avgEdge =
    items.length > 0 ? items.reduce((s, i) => s + i.edge, 0) / items.length : 0
  const bestEdge = items.length > 0 ? Math.max(...items.map((i) => i.edge)) : 0

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">AI · Değer Motoru</div>
          <h1 style={{ marginTop: 6 }}>Değer Analizi</h1>
          <div className="sub" style={{ marginTop: 4 }}>
            Modelin olasılığı piyasanın ima ettiğini geçtiğinde fırsat doğar.
            Avantaja göre sıralı.
          </div>
        </div>
        {items.length > 0 && (
          <div className="right" style={{ display: 'flex', gap: 22 }}>
            <div>
              <div
                className="l"
                style={{ fontSize: 11, color: 'var(--faint)' }}
              >
                Fırsat
              </div>
              <div
                className="display"
                style={{ fontSize: 22, fontWeight: 800 }}
              >
                {items.length}
              </div>
            </div>
            <div>
              <div
                className="l"
                style={{ fontSize: 11, color: 'var(--faint)' }}
              >
                Ort. avantaj
              </div>
              <div
                className="display pos"
                style={{ fontSize: 22, fontWeight: 800 }}
              >
                {signedPct(avgEdge)}
              </div>
            </div>
            <div>
              <div
                className="l"
                style={{ fontSize: 11, color: 'var(--faint)' }}
              >
                En yüksek
              </div>
              <div
                className="display pos"
                style={{ fontSize: 22, fontWeight: 800 }}
              >
                {signedPct(bestEdge)}
              </div>
            </div>
          </div>
        )}
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
          <span
            className="chip"
            style={{ pointerEvents: 'none', opacity: 0.8 }}
          >
            Güncelleme: {timeAgo(data?.updatedAt ?? null)}
          </span>
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
            Şu an listelenecek değer fırsatı yok. Değer motoru yaklaşan maçlar
            için piyasa ve model olasılığını karşılaştırdığında fırsatlar burada
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
          Avantaj = model olasılığı − piyasa beklentisi. Önerilen ağırlık, model
          güvenine göre orantısal bir göstergedir. Yalnızca pozitif beklenen
          değerli seçimler listelenir. Bu içerik yalnızca bilgilendirme ve
          eğlence amaçlıdır; tavsiye niteliği taşımaz.
        </span>
      </div>
    </div>
  )
}
