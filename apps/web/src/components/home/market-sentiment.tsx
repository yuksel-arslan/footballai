'use client'

import type { ValueBetsPayload } from '@/hooks/use-value-bets'

/**
 * "Piyasa Ne Diyor?" — general market overview for today's priced fixtures.
 *
 * Pure client-side derivation from the already-fetched value-bets payload
 * (market 1X2 odds + the model's value picks). No extra request, no cost.
 * Heavy reasoning stays in the background; the card shows a clean, simple
 * read of where the market leans and where the model disagrees.
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

export function MarketSentiment({ payload }: { payload: ValueBetsPayload }) {
  const odds = payload.odds ?? []
  const priced = odds.length

  // Need a meaningful sample to say anything about "the market".
  if (priced < 3) return null

  let homeFav = 0
  let drawFav = 0
  let awayFav = 0
  let tight = 0 // no clear favorite (top probability under 45%)
  let strong = 0 // clear favorite (top probability 60%+)
  let homeSum = 0
  let awaySum = 0

  for (const m of odds) {
    const p = impliedProbs(m.odds)
    homeSum += p.home
    awaySum += p.away
    const top = Math.max(p.home, p.draw, p.away)
    if (p.home === top) homeFav++
    else if (p.away === top) awayFav++
    else drawFav++
    if (top < 0.45) tight++
    if (top >= 0.6) strong++
  }

  const avgHome = Math.round((homeSum / priced) * 100)
  const avgAway = Math.round((awaySum / priced) * 100)
  const divergence = payload.items.length // matches where the model finds an edge

  // Distribution bar widths (favorite split across the priced sample).
  const homePct = (homeFav / priced) * 100
  const drawPct = (drawFav / priced) * 100
  const awayPct = (awayFav / priced) * 100

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="card-h">
        <h3>Piyasa Ne Diyor?</h3>
        <span className="hint">{priced} maç fiyatlandı</span>
      </div>

      <p className="disc" style={{ marginTop: 0, marginBottom: 14 }}>
        Bahis piyasası bugünkü maçların{' '}
        <b style={{ color: 'var(--txt)' }}>{strong} tanesinde net favori</b>{' '}
        görüyor, <b style={{ color: 'var(--txt)' }}>{tight} maç</b> ise
        çekişmeli fiyatlanıyor. Ortalama ev sahibi galibiyet beklentisi %
        {avgHome}.
      </p>

      {/* favorite split bar */}
      <div
        style={{
          display: 'flex',
          height: 10,
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: 8,
        }}
        aria-hidden
      >
        <span
          style={{ width: `${homePct}%`, background: 'var(--c1, #10b981)' }}
        />
        <span style={{ width: `${drawPct}%`, background: 'var(--line2)' }} />
        <span
          style={{ width: `${awayPct}%`, background: 'var(--c2, #6366f1)' }}
        />
      </div>
      <div
        className="disc"
        style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}
      >
        <span>● Ev favori {homeFav}</span>
        <span>● Beraberlik {drawFav}</span>
        <span>● Deplasman favori {awayFav}</span>
      </div>

      <div className="perf" style={{ marginTop: 14 }}>
        <div className="pm">
          <span className="l">Net favorili maç</span>
          <span className="v">{strong}</span>
        </div>
        <div className="pm">
          <span className="l">Çekişmeli maç</span>
          <span className="v">{tight}</span>
        </div>
        <div className="pm">
          <span className="l">Ort. ev / deplasman beklentisi</span>
          <span className="v">
            %{avgHome} / %{avgAway}
          </span>
        </div>
        {divergence > 0 && (
          <div className="pm">
            <span className="l">Modelin piyasadan ayrıştığı maç</span>
            <span className="v pos">{divergence}</span>
          </div>
        )}
      </div>

      <div className="disc" style={{ marginTop: 12 }}>
        Oranlardan türetilen genel piyasa değerlendirmesi. Modelin ayrıştığı
        maçlar değer fırsatı olabilir.
      </div>
    </div>
  )
}
