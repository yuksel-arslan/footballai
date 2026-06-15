'use client'

import Link from 'next/link'
import type { ValueBetsPayload } from '@/hooks/use-value-bets'

/**
 * "Piyasa Ne Diyor?" — the betting market's actual read of each upcoming match,
 * derived from real bookmaker 1X2 odds (fetched per fixture, cached). No vague
 * invented narrative: every row is one real match with the market's favoured
 * outcome and the odds-implied probability behind it. No extra request, no cost.
 */

interface Implied {
  home: number
  draw: number
  away: number
}

function impliedProbs(o: {
  home: number
  draw: number
  away: number
}): Implied {
  const ih = 1 / o.home
  const id = 1 / o.draw
  const ia = 1 / o.away
  const s = ih + id + ia
  if (!isFinite(s) || s <= 0) return { home: 1 / 3, draw: 1 / 3, away: 1 / 3 }
  return { home: ih / s, draw: id / s, away: ia / s }
}

const SIDE_LABEL = {
  home: 'Ev sahibi',
  draw: 'Beraberlik',
  away: 'Deplasman',
} as const

export function MarketSentiment({ payload }: { payload: ValueBetsPayload }) {
  const odds = payload.odds ?? []
  const priced = odds.length

  // Nothing real to show until the market has priced some matches.
  if (priced === 0) return null

  // Fixtures the model flags as value (market disagreement), for a per-row hint.
  const valueIds = new Set(payload.items.map((i) => i.fixtureId))

  const rows = odds
    .map((m) => {
      const p = impliedProbs(m.odds)
      const sides = [
        { side: 'home' as const, prob: p.home, odd: m.odds.home },
        { side: 'draw' as const, prob: p.draw, odd: m.odds.draw },
        { side: 'away' as const, prob: p.away, odd: m.odds.away },
      ]
      const fav = sides.reduce((a, b) => (b.prob > a.prob ? b : a))
      return {
        fixtureId: m.fixtureId,
        home: m.home,
        away: m.away,
        favLabel: SIDE_LABEL[fav.side],
        favPct: Math.round(fav.prob * 100),
        favOdd: fav.odd,
        isValue: valueIds.has(m.fixtureId),
      }
    })
    // Strongest market conviction first.
    .sort((a, b) => b.favPct - a.favPct)
    .slice(0, 8)

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="card-h">
        <h3>Piyasa Ne Diyor?</h3>
        <span className="hint">{priced} maç · canlı oranlar</span>
      </div>

      <p className="disc" style={{ marginTop: 0, marginBottom: 6 }}>
        Bahis piyasasının canlı oranlarına göre her maçta en olası görülen sonuç
        ve oranın ima ettiği olasılık. Düşük oran = piyasanın net favorisi.
      </p>

      <div className="perf" style={{ marginTop: 6 }}>
        {rows.map((r) => (
          <Link
            key={r.fixtureId}
            href={`/matches/${r.fixtureId}`}
            className="pm"
            style={{ textDecoration: 'none', gap: 10 }}
          >
            <span
              className="l"
              style={{
                color: 'var(--txt)',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
            >
              {r.home} <span className="muted">-</span> {r.away}
            </span>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flex: 'none',
              }}
            >
              {r.isValue && (
                <span className="edge-pill" style={{ fontSize: 11 }}>
                  değer
                </span>
              )}
              <span className="edge-pill sm">
                {r.favLabel} %{r.favPct}
              </span>
              <span
                className="muted"
                style={{ fontSize: 12.5, minWidth: 46, textAlign: 'right' }}
              >
                @{r.favOdd.toFixed(2)}
              </span>
            </span>
          </Link>
        ))}
      </div>

      <div className="disc" style={{ marginTop: 12 }}>
        Oranlar bahis piyasasından alınır.
        {payload.items.length > 0 && (
          <>
            {' '}
            Modelin piyasadan ayrıştığı{' '}
            <b style={{ color: 'var(--txt)' }}>
              {payload.items.length} maç
            </b>{' '}
            değer fırsatı olabilir.
          </>
        )}
      </div>
    </div>
  )
}
