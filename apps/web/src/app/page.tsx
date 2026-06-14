'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Bell, X } from 'lucide-react'
import type { Team } from '@/lib/api'
import { canonicalTeam } from '@/lib/team-name'
import { useUpcomingFixtures, useLiveFixtures } from '@/hooks/use-fixtures'
import { useValueBets, type ValueBetItem } from '@/hooks/use-value-bets'
import { useFeatured, type FeaturedPrediction } from '@/hooks/use-featured'
import { Crest } from '@/components/app/crest'
import { MatchRow } from '@/components/app/match-row'
import { MarketSentiment } from '@/components/home/market-sentiment'
import { formatLongDate, formatTime, pct } from '@/lib/format'

function teamStub(name: string): Team {
  return { id: 0, name }
}
function signedPct(fraction: number): string {
  const v = fraction * 100
  return `${v >= 0 ? '+' : ''}%${v.toFixed(1)}`
}

/* ── measured model track record (settled picks + value-bet P/L) ── */

interface PerfSummary {
  settled: number
  accuracy: number | null
  rps: number | null
  valueBets?: {
    settled: number
    wins: number
    profitUnits: number
    roi: number | null
    weekly: { week: string; profit: number; cumulative: number }[]
  }
}

function usePerfSummary() {
  return useQuery<PerfSummary | null>({
    queryKey: ['performance'],
    queryFn: async () => {
      const res = await fetch('/api/predictions/performance')
      const json = await res.json().catch(() => null)
      return json?.data ?? null
    },
    staleTime: 1000 * 60 * 30,
  })
}

function WeeklyBars({
  weekly,
}: {
  weekly: { week: string; cumulative: number }[]
}) {
  if (weekly.length < 2) return null
  const max = Math.max(...weekly.map((w) => Math.abs(w.cumulative)), 0.5)
  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
          height: 56,
        }}
      >
        {weekly.map((w) => (
          <span
            key={w.week}
            title={`${w.week}: ${w.cumulative >= 0 ? '+' : ''}${w.cumulative} birim`}
            style={{
              flex: 1,
              height: `${Math.max((Math.abs(w.cumulative) / max) * 100, 6)}%`,
              borderRadius: 3,
              background: w.cumulative >= 0 ? 'var(--c1, #10b981)' : '#ef4444',
              opacity: 0.5 + 0.5 * (Math.abs(w.cumulative) / max),
            }}
          />
        ))}
      </div>
      <div className="disc" style={{ marginTop: 8 }}>
        Haftalık birikimli getiri (1 birimlik, gerçek sonuçlanan değer
        sinyalleri).
      </div>
    </div>
  )
}

function ModelPerformancePanel({
  liveCount,
  upcomingCount,
  valueCount,
}: {
  liveCount: number
  upcomingCount: number
  valueCount: number
}) {
  const { data: perf } = usePerfSummary()
  const vb = perf?.valueBets
  const hasTrack = (perf?.settled ?? 0) > 0 || (vb?.settled ?? 0) > 0

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-h">
        <h3>Model performansı</h3>
        <span className="hint">{hasTrack ? 'ölçülen' : 'canlı'}</span>
      </div>
      <div className="perf">
        {vb && vb.settled > 0 && vb.roi != null && (
          <div className="pm">
            <span className="l">Getiri (ROI)</span>
            <span className={`v ${vb.roi >= 0 ? 'pos' : ''}`}>
              {signedPct(vb.roi)}
            </span>
          </div>
        )}
        {perf?.accuracy != null && (
          <div className="pm">
            <span className="l">İsabet oranı</span>
            <span className="v">%{perf.accuracy}</span>
          </div>
        )}
        {(perf?.settled ?? 0) > 0 && (
          <div className="pm">
            <span className="l">Sonuçlanan tahmin</span>
            <span className="v">{perf!.settled}</span>
          </div>
        )}
        {perf?.rps != null && (
          <div className="pm">
            <span className="l">RPS (baz 0.209)</span>
            <span className={`v ${perf.rps < 0.209 ? 'pos' : ''}`}>
              {perf.rps.toFixed(3)}
            </span>
          </div>
        )}
        {!hasTrack && (
          <>
            <div className="pm">
              <span className="l">Değer analizi</span>
              <span className="v pos">{valueCount}</span>
            </div>
            <div className="pm">
              <span className="l">Canlı maçlar</span>
              <span className="v">{liveCount}</span>
            </div>
            <div className="pm">
              <span className="l">Yaklaşan maçlar</span>
              <span className="v">{upcomingCount}</span>
            </div>
          </>
        )}
      </div>

      {vb && vb.weekly.length > 1 && <WeeklyBars weekly={vb.weekly} />}

      <div style={{ marginTop: 'auto', paddingTop: 18 }}>
        <Link
          href="/performance"
          style={{
            color: 'var(--c2)',
            fontWeight: 600,
            fontSize: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Performans merkezi <ArrowRight size={15} />
        </Link>
      </div>
      <div className="disc" style={{ marginTop: 12 }}>
        Tüm rakamlar sonuçlanmış tahminlerden ölçülür. Geçmiş performans gelecek
        sonuçları garanti etmez.
      </div>
    </div>
  )
}

/* ── "new value opportunity" toast (per-device, dismissible) ── */

const SEEN_KEY = 'seen-value-bets'

function ValueAlertToast({ items }: { items: ValueBetItem[] }) {
  const [fresh, setFresh] = useState<ValueBetItem | null>(null)

  useEffect(() => {
    if (items.length === 0) return
    let seen: number[] = []
    try {
      seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') as number[]
    } catch {
      /* first visit */
    }
    const firstNew =
      seen.length > 0
        ? items.find((i) => !seen.includes(i.fixtureId))
        : undefined // first visit: everything is "new" — stay quiet
    if (firstNew) setFresh(firstNew)
    try {
      localStorage.setItem(
        SEEN_KEY,
        JSON.stringify(items.map((i) => i.fixtureId).slice(0, 50))
      )
    } catch {
      /* storage blocked */
    }
  }, [items])

  if (!fresh) return null
  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 60,
        maxWidth: 340,
        width: 'calc(100vw - 32px)',
        background: 'var(--card, #11161d)',
        border: '1px solid var(--line2)',
        borderRadius: 14,
        padding: 14,
        boxShadow: '0 12px 32px rgba(0,0,0,.35)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <Bell size={15} color="var(--c1, #10b981)" />
        <b style={{ fontSize: 13.5, flex: 1 }}>Yeni değerli fırsat</b>
        <button
          onClick={() => setFresh(null)}
          aria-label="Kapat"
          style={{
            background: 'none',
            border: 0,
            cursor: 'pointer',
            color: 'var(--muted)',
          }}
        >
          <X size={15} />
        </button>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          marginBottom: 10,
        }}
      >
        <Crest team={teamStub(fresh.home)} />
        <span style={{ fontWeight: 600 }}>
          {fresh.home} - {fresh.away}
        </span>
        <span className="edge-pill" style={{ marginLeft: 'auto' }}>
          {signedPct(fresh.edge)}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 12.5 }}>
          <b>{fresh.pickLabel}</b>{' '}
          <span className="muted">@{fresh.odds.toFixed(2)}</span>
        </span>
        <Link
          href={`/matches/${fresh.fixtureId}`}
          onClick={() => setFresh(null)}
          style={{
            background: 'var(--c1, #10b981)',
            color: '#04110a',
            fontWeight: 700,
            fontSize: 12.5,
            padding: '7px 14px',
            borderRadius: 10,
          }}
        >
          İncele
        </Link>
      </div>
    </div>
  )
}

/* ── value-bet driven cards (real EV/edge/odds) ── */

function ValueCard({ item }: { item: ValueBetItem }) {
  return (
    <Link className="vcard" href={`/matches/${item.fixtureId}`}>
      <div className="vtop">
        <span className="lg">
          {item.league.name} · {formatTime(item.matchDate)}
        </span>
        <span className="ed">
          <span className="edge-pill">{signedPct(item.edge)}</span>
        </span>
      </div>
      <div className="teams">
        <Crest team={teamStub(item.home)} />
        <span className="nm">{item.home}</span>
        <span className="vs">-</span>
        <span className="nm">{item.away}</span>
        <Crest team={teamStub(item.away)} />
      </div>
      <div className="pickline">
        <span className="pk">
          {item.pickLabel} <span className="odds">@{item.odds.toFixed(2)}</span>
        </span>
      </div>
      <div className="metrics">
        <div className="m">
          <div className="l">Beklenen Değer</div>
          <div className="v pos">{signedPct(item.evPerUnit)}</div>
        </div>
        <div className="m">
          <div className="l">Model</div>
          <div className="v">%{pct(item.modelProb)}</div>
        </div>
      </div>
    </Link>
  )
}

function ValueFeat({ item }: { item: ValueBetItem }) {
  return (
    <Link className="feat" href={`/matches/${item.fixtureId}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="vbadge">Günün en değerli tahmini</span>
        <span className="tag">
          {item.league.name} · {formatTime(item.matchDate)}
        </span>
      </div>
      <div className="teams">
        <Crest team={teamStub(item.home)} size="md" />
        <span className="nm">{item.home}</span>
        <span className="vs">-</span>
        <span className="nm">{item.away}</span>
        <Crest team={teamStub(item.away)} size="md" />
      </div>
      <div className="pick">
        {item.pickLabel} <span className="odds">@ {item.odds.toFixed(2)}</span>
      </div>
      <div className="why">
        Model bu seçimi %{pct(item.modelProb)} olasılıkla görüyor; piyasa ise %
        {pct(item.marketProb)} fiyatlıyor. Aradaki{' '}
        <b style={{ color: 'var(--txt)' }}>{signedPct(item.edge)}</b> avantaj
        pozitif beklenen değer yaratıyor.
      </div>
      <div className="fmeta">
        <div>
          <div className="l">Avantaj</div>
          <div className="v pos">{signedPct(item.edge)}</div>
        </div>
        <div>
          <div className="l">Beklenen Değer</div>
          <div className="v pos">{signedPct(item.evPerUnit)}</div>
        </div>
        <div>
          <div className="l">Güven</div>
          <div className="v">%{pct(item.modelProb)}</div>
        </div>
        <div>
          <div className="l">Önerilen pay</div>
          <div className="v">%{(item.recKelly * 100).toFixed(1)}</div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--c2)',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Tam analizi gör →
      </div>
    </Link>
  )
}

/* ── free featured pick (stored prediction, or form-based lean) ── */

function FeaturedFeat({ f }: { f: FeaturedPrediction }) {
  const isModel = f.source === 'model'
  return (
    <Link className="feat" href={`/matches/${f.fixtureId}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="vbadge">Öne çıkan tahmin · ücretsiz</span>
        <span className="tag">
          {f.league} · {formatTime(f.matchDate)}
        </span>
      </div>
      <div className="teams">
        <Crest team={teamStub(f.home)} size="md" />
        <span className="nm">{f.home}</span>
        <span className="vs">-</span>
        <span className="nm">{f.away}</span>
        <Crest team={teamStub(f.away)} size="md" />
      </div>
      <div className="pick">{f.pickLabel}</div>
      <div className="why">
        {isModel ? (
          <>
            Model bu maçta <b style={{ color: 'var(--txt)' }}>{f.pickLabel}</b>{' '}
            sonucunu %{f.prob} olasılıkla öne çıkarıyor.
          </>
        ) : (
          <>
            Son form verilerine göre öne çıkan taraf:{' '}
            <b style={{ color: 'var(--txt)' }}>{f.pickLabel}</b>. Tam model
            tahmini ve değer analizi için maça girin.
          </>
        )}
      </div>
      <div className="fmeta">
        <div>
          <div className="l">
            {isModel ? 'Galibiyet olasılığı' : 'Son 10 galibiyet'}
          </div>
          <div className="v pos">%{f.prob}</div>
        </div>
        {f.confidence != null && (
          <div>
            <div className="l">Güven</div>
            <div className="v">%{f.confidence}</div>
          </div>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--c2)',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Tam analizi gör →
      </div>
    </Link>
  )
}

export default function HomePage() {
  const { data: upcoming = [], isLoading } = useUpcomingFixtures()
  const { data: live = [] } = useLiveFixtures()
  const { data: vb } = useValueBets()
  const { data: featuredData } = useFeatured()

  const valueBets = vb?.items ?? []
  const hasValue = valueBets.length > 0

  // Featured pick comes from stored predictions (or a free form lean) via the
  // DB, since the externally-sourced upcoming list doesn't carry predictions.
  const featured = featuredData?.featured ?? null
  const predictedCount = featuredData?.predictedCount ?? 0

  // A match that's already live can still sit in the externally-sourced
  // upcoming list (different provider, stale kickoff). Drop any upcoming
  // fixture whose team pair is currently live so it doesn't show twice.
  // Cross-provider ids differ, so match by canonical team names.
  const liveKeys = new Set(
    live.map(
      (f) =>
        `${canonicalTeam(f.homeTeam.name)}|${canonicalTeam(f.awayTeam.name)}`
    )
  )
  const upcomingList = upcoming
    .filter(
      (f) =>
        !liveKeys.has(
          `${canonicalTeam(f.homeTeam.name)}|${canonicalTeam(f.awayTeam.name)}`
        )
    )
    .slice(0, 6)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">{formatLongDate()}</div>
          <h1 style={{ marginTop: 6 }}>
            {hasValue ? 'Günün fırsatları' : 'Günün maçları'}
          </h1>
        </div>
        <div className="right">
          <span className="disc">
            {hasValue ? (
              <>
                Model bugün{' '}
                <b style={{ color: 'var(--txt)' }}>{valueBets.length} maçta</b>{' '}
                piyasaya karşı avantaj buldu
              </>
            ) : (
              <>
                Model bugün{' '}
                <b style={{ color: 'var(--txt)' }}>{predictedCount} maçta</b>{' '}
                tahmin üretti
              </>
            )}
          </span>
        </div>
      </div>

      {/* HERO */}
      <div className="hero">
        {hasValue ? (
          <ValueFeat item={valueBets[0]} />
        ) : featured ? (
          <FeaturedFeat f={featured} />
        ) : (
          <div className="feat" style={{ justifyContent: 'center' }}>
            <span className="vbadge">Öne çıkan tahmin</span>
            <p className="why" style={{ marginTop: 14 }}>
              {isLoading
                ? 'Maçlar yükleniyor…'
                : 'Günün öne çıkan tahmini hazırlanır hazırlanmaz burada.'}
            </p>
          </div>
        )}

        <ModelPerformancePanel
          liveCount={live.length}
          upcomingCount={upcoming.length}
          valueCount={valueBets.length}
        />
      </div>

      {/* MARKET SENTIMENT */}
      {vb && <MarketSentiment payload={vb} />}

      {/* NEW-OPPORTUNITY TOAST */}
      <ValueAlertToast items={valueBets} />

      {/* LIVE */}
      {live.length > 0 && (
        <>
          <div className="section-h">
            <h2>Canlı</h2>
            <Link href="/matches">Tümünü gör →</Link>
          </div>
          {live.slice(0, 4).map((f) => (
            <MatchRow key={f.id} fixture={f} />
          ))}
        </>
      )}

      {/* VALUE BETS GRID */}
      {hasValue && valueBets.length > 1 && (
        <>
          <div className="section-h">
            <h2>Günün değer fırsatları</h2>
            <Link href="/predictions">Tümünü gör →</Link>
          </div>
          <div className="vgrid">
            {valueBets.slice(1, 7).map((item) => (
              <ValueCard key={item.fixtureId} item={item} />
            ))}
          </div>
        </>
      )}

      {/* UPCOMING LIST */}
      <div className="section-h">
        <h2>Yaklaşan maçlar</h2>
        <Link href="/matches">Tümü →</Link>
      </div>
      {upcomingList.length > 0 ? (
        upcomingList.map((f) => <MatchRow key={f.id} fixture={f} />)
      ) : (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            {isLoading
              ? 'Yükleniyor…'
              : 'Yeni maçlar takvime eklendikçe burada listelenir.'}
          </p>
        </div>
      )}
    </div>
  )
}
