'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Fixture, Team } from '@/lib/api'
import { useUpcomingFixtures, useLiveFixtures } from '@/hooks/use-fixtures'
import { useValueBets, type ValueBetItem } from '@/hooks/use-value-bets'
import { Crest } from '@/components/app/crest'
import { MatchRow } from '@/components/app/match-row'
import { formatLongDate, formatTime, predictionPick, pct } from '@/lib/format'

function teamStub(name: string): Team {
  return { id: 0, name }
}
function signedPct(fraction: number): string {
  const v = fraction * 100
  return `${v >= 0 ? '+' : ''}%${v.toFixed(1)}`
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

/* ── model-prediction fallback (before the value cache is populated) ── */

function ModelFeat({ fixture }: { fixture: Fixture }) {
  const pick = predictionPick(fixture)
  if (!pick) return null
  return (
    <Link className="feat" href={`/matches/${fixture.id}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="vbadge">Öne çıkan tahmin</span>
        <span className="tag">
          {fixture.league.name} · {formatTime(fixture.matchDate)}
        </span>
      </div>
      <div className="teams">
        <Crest team={fixture.homeTeam} size="md" />
        <span className="nm">{fixture.homeTeam.name}</span>
        <span className="vs">-</span>
        <span className="nm">{fixture.awayTeam.name}</span>
        <Crest team={fixture.awayTeam} size="md" />
      </div>
      <div className="pick">{pick.label}</div>
      <div className="why">
        Model bu maçta <b style={{ color: 'var(--txt)' }}>{pick.label}</b>{' '}
        sonucunu %{pct(pick.prob)} olasılıkla öne çıkarıyor.
      </div>
      <div className="fmeta">
        <div>
          <div className="l">Galibiyet olasılığı</div>
          <div className="v pos">%{pct(pick.prob)}</div>
        </div>
        <div>
          <div className="l">Güven</div>
          <div className="v">%{pct(pick.confidence)}</div>
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

export default function HomePage() {
  const { data: upcoming = [], isLoading } = useUpcomingFixtures()
  const { data: live = [] } = useLiveFixtures()
  const { data: vb } = useValueBets()

  const valueBets = vb?.items ?? []
  const hasValue = valueBets.length > 0

  const withPred = upcoming.filter((f) => predictionPick(f) !== null)
  const fallbackFeat = withPred[0]
  const upcomingList = upcoming.slice(0, 6)

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
                <b style={{ color: 'var(--txt)' }}>{withPred.length} maçta</b>{' '}
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
        ) : fallbackFeat ? (
          <ModelFeat fixture={fallbackFeat} />
        ) : (
          <div className="feat" style={{ justifyContent: 'center' }}>
            <span className="vbadge">Öne çıkan tahmin</span>
            <p className="why" style={{ marginTop: 14 }}>
              {isLoading
                ? 'Maçlar yükleniyor…'
                : 'Şu an öne çıkan bir tahmin bulunmuyor.'}
            </p>
          </div>
        )}

        <div
          className="card"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <div className="card-h">
            <h3>Model özeti</h3>
            <span className="hint">canlı</span>
          </div>
          <div className="perf">
            <div className="pm">
              <span className="l">Değerli bahisler</span>
              <span className="v pos">{valueBets.length}</span>
            </div>
            <div className="pm">
              <span className="l">Canlı maçlar</span>
              <span className="v">{live.length}</span>
            </div>
            <div className="pm">
              <span className="l">Yaklaşan maçlar</span>
              <span className="v">{upcoming.length}</span>
            </div>
          </div>
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
            Değer = model olasılığı − piyasa ima olasılığı. Geçmiş performans
            gelecek sonuçları garanti etmez.
          </div>
        </div>
      </div>

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
            <h2>Günün değerli bahisleri</h2>
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
            {isLoading ? 'Yükleniyor…' : 'Yaklaşan maç bulunamadı.'}
          </p>
        </div>
      )}
    </div>
  )
}
