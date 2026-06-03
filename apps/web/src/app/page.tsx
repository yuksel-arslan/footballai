'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Fixture } from '@/lib/api'
import { useUpcomingFixtures, useLiveFixtures } from '@/hooks/use-fixtures'
import { Crest } from '@/components/app/crest'
import { MatchRow } from '@/components/app/match-row'
import { formatLongDate, formatTime, predictionPick, pct } from '@/lib/format'

function ValueCard({ fixture }: { fixture: Fixture }) {
  const pick = predictionPick(fixture)
  if (!pick) return null
  return (
    <Link className="vcard" href={`/matches/${fixture.id}`}>
      <div className="vtop">
        <span className="lg">
          {fixture.league.name} · {formatTime(fixture.matchDate)}
        </span>
        <span className="ed">
          <span className="edge-pill">%{pct(pick.confidence)} güven</span>
        </span>
      </div>
      <div className="teams">
        <Crest team={fixture.homeTeam} />
        <span className="nm">{fixture.homeTeam.name}</span>
        <span className="vs">-</span>
        <span className="nm">{fixture.awayTeam.name}</span>
        <Crest team={fixture.awayTeam} />
      </div>
      <div className="pickline">
        <span className="pk">{pick.label}</span>
      </div>
      <div className="metrics">
        <div className="m">
          <div className="l">Olasılık</div>
          <div className="v pos">%{pct(pick.prob)}</div>
        </div>
        <div className="m">
          <div className="l">Güven</div>
          <div className="v">%{pct(pick.confidence)}</div>
        </div>
      </div>
    </Link>
  )
}

export default function HomePage() {
  const { data: upcoming = [], isLoading } = useUpcomingFixtures()
  const { data: live = [] } = useLiveFixtures()

  const withPred = upcoming.filter((f) => predictionPick(f) !== null)
  const featured = withPred[0]
  const featPick = featured ? predictionPick(featured) : null
  const valueCards = withPred.slice(1, 7)
  const upcomingList = upcoming.slice(0, 6)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">{formatLongDate()}</div>
          <h1 style={{ marginTop: 6 }}>Günün maçları</h1>
        </div>
        <div className="right">
          <span className="disc">
            Model bugün{' '}
            <b style={{ color: 'var(--txt)' }}>{withPred.length} maçta</b>{' '}
            tahmin üretti
          </span>
        </div>
      </div>

      {/* HERO */}
      <div className="hero">
        {featured && featPick ? (
          <Link className="feat" href={`/matches/${featured.id}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="vbadge">Öne çıkan tahmin</span>
              <span className="tag">
                {featured.league.name} · {formatTime(featured.matchDate)}
              </span>
            </div>
            <div className="teams">
              <Crest team={featured.homeTeam} size="md" />
              <span className="nm">{featured.homeTeam.name}</span>
              <span className="vs">-</span>
              <span className="nm">{featured.awayTeam.name}</span>
              <Crest team={featured.awayTeam} size="md" />
            </div>
            <div className="pick">{featPick.label}</div>
            <div className="why">
              Model bu maçta{' '}
              <b style={{ color: 'var(--txt)' }}>{featPick.label}</b> sonucunu %
              {pct(featPick.prob)} olasılıkla öne çıkarıyor. Detaylı olasılık
              dağılımı ve karşılaştırma için analizi inceleyin.
            </div>
            <div className="fmeta">
              <div>
                <div className="l">Galibiyet olasılığı</div>
                <div className="v pos">%{pct(featPick.prob)}</div>
              </div>
              <div>
                <div className="l">Güven</div>
                <div className="v">%{pct(featPick.confidence)}</div>
              </div>
              {featured.predictions?.[0]?.predictedHomeScore != null && (
                <div>
                  <div className="l">Tahmini skor</div>
                  <div className="v">
                    {featured.predictions[0].predictedHomeScore}-
                    {featured.predictions[0].predictedAwayScore}
                  </div>
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
        ) : (
          <div className="feat" style={{ justifyContent: 'center' }}>
            <span className="vbadge">Öne çıkan tahmin</span>
            <p className="why" style={{ marginTop: 14 }}>
              {isLoading
                ? 'Maçlar yükleniyor…'
                : 'Şu an tahmin üretilmiş yaklaşan maç bulunmuyor.'}
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
              <span className="l">Bugünkü tahminler</span>
              <span className="v pos">{withPred.length}</span>
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
            Tahminler Poisson + XGBoost topluluğu ile üretilir. Geçmiş
            performans gelecek sonuçları garanti etmez.
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

      {/* VALUE / PREDICTIONS GRID */}
      {valueCards.length > 0 && (
        <>
          <div className="section-h">
            <h2>Günün öne çıkan tahminleri</h2>
            <Link href="/predictions">Tümünü gör →</Link>
          </div>
          <div className="vgrid">
            {valueCards.map((f) => (
              <ValueCard key={f.id} fixture={f} />
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
