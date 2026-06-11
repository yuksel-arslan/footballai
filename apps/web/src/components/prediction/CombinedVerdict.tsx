'use client'

import type { PredictionData } from '@/hooks/use-prediction'
import type { DixonColesResult } from '@/hooks/use-dixon-coles'

/**
 * Unified, plain-language read of a match that fuses BOTH analyses the user
 * can run on this page: the AI prediction (intuitive, explained) and the
 * Dixon-Coles statistical/value model (numeric, odds-aware). It renders once
 * either result exists and gets sharper when both do — agreement is a strong
 * signal, disagreement a caution. Deterministic: built from the numbers the
 * two cards already produced, so it costs no extra credits.
 */
export function CombinedVerdict({
  ai,
  dc,
  homeTeam,
  awayTeam,
}: {
  ai: PredictionData | null
  dc: DixonColesResult | null
  homeTeam: string
  awayTeam: string
}) {
  if (!ai && !dc) return null

  const DRAW = 'Beraberlik'
  type Side = 'home' | 'draw' | 'away'
  const nameOf = (s: Side) =>
    s === 'home' ? homeTeam : s === 'away' ? awayTeam : DRAW

  // AI probabilities are stored 0–100; Dixon-Coles 0–1. Normalise to percent.
  const aiTop = ai
    ? (
        [
          ['home', ai.homeWinProb],
          ['draw', ai.drawProb],
          ['away', ai.awayWinProb],
        ] as [Side, number][]
      ).reduce((a, b) => (b[1] > a[1] ? b : a))
    : null
  const dcTop = dc
    ? (
        [
          ['home', dc.probabilities.home_win * 100],
          ['draw', dc.probabilities.draw * 100],
          ['away', dc.probabilities.away_win * 100],
        ] as [Side, number][]
      ).reduce((a, b) => (b[1] > a[1] ? b : a))
    : null

  const lines: string[] = []

  // 1) Headline: cross-reference the two models when both ran.
  if (aiTop && dcTop) {
    const aiPct = Math.round(aiTop[1])
    const dcPct = Math.round(dcTop[1])
    if (aiTop[0] === dcTop[0]) {
      lines.push(
        `Hem yapay zekâ tahmini hem istatistiksel model aynı sonucu öne çıkarıyor: ${nameOf(
          aiTop[0]
        )} (AI %${aiPct}, model %${dcPct}). Bu tutarlılık güçlü bir sinyaldir.`
      )
    } else {
      lines.push(
        `İki yöntem ayrışıyor: yapay zekâ ${nameOf(
          aiTop[0]
        )} derken (%${aiPct}), istatistiksel model ${nameOf(
          dcTop[0]
        )} tarafını öne çıkarıyor (%${dcPct}). Görüş birliği yok — bu maçta belirsizlik yüksek, temkinli olun.`
      )
    }
  } else if (aiTop) {
    const aiPct = Math.round(aiTop[1])
    lines.push(
      `Yapay zekâ tahmini ${nameOf(aiTop[0])} sonucunu öne çıkarıyor (%${aiPct}).`
    )
  } else if (dcTop) {
    const dcPct = Math.round(dcTop[1])
    lines.push(
      `İstatistiksel model ${nameOf(dcTop[0])} sonucunu öne çıkarıyor (%${dcPct}).`
    )
  }

  // 2) Score / goal expectation — prefer the model's expected goals, else the
  //    AI's predicted scoreline.
  if (
    dc &&
    Number.isFinite(dc.probabilities.expected_home_goals) &&
    Number.isFinite(dc.probabilities.expected_away_goals)
  ) {
    const xh = dc.probabilities.expected_home_goals
    const xa = dc.probabilities.expected_away_goals
    const total = xh + xa
    const tempo =
      total >= 3
        ? 'gollü bir maç bekleniyor'
        : total >= 2.2
          ? 'orta tempolu, 2-3 gollü bir maç bekleniyor'
          : 'az gollü, kontrollü bir maç bekleniyor'
    lines.push(
      `Beklenen skor yaklaşık ${xh.toFixed(1)} - ${xa.toFixed(1)}; ${tempo}.`
    )
  } else if (ai && ai.predictedHomeScore != null) {
    lines.push(
      `Yapay zekânın tahmini skoru: ${ai.predictedHomeScore} - ${ai.predictedAwayScore}.`
    )
  }

  // 3) Betting verdict from the value model.
  const valueBets = (dc?.value ?? []).filter((v) => v.is_value)
  if (valueBets.length > 0) {
    const best = [...valueBets].sort((a, b) => b.edge - a.edge)[0]
    const modelPct = Math.round(best.model_prob * 100)
    const marketPct = Math.round(best.market_prob_vigfree * 100)
    const stake = (best.rec_kelly * 100).toFixed(1)
    lines.push(
      `Bahis açısından: ${nameOf(
        best.selection as Side
      )} seçeneğinde matematiksel avantaj var. Model %${modelPct} olası görüyor, oran ise %${marketPct} fiyatlıyor — oran cömert. Oynayacaksanız kasanızın ~%${stake}'i ile sınırlı kalın.`
    )
    if (dc?.oddsSource === 'ai') {
      lines.push(
        'Not: Oranlar piyasa yerine AI tahmini; piyasa açılınca gerçek oranlarla tekrar bakın.'
      )
    }
  } else if (dc) {
    lines.push(
      'Bahis açısından: bu oranlarda matematiksel avantaj yok — oranlar modelin beklentisiyle uyumlu, bu maçta bahsi geçmek mantıklı.'
    )
  }

  // 4) Confidence read when the AI provided one.
  if (ai && Number.isFinite(ai.confidence)) {
    const conf = ai.confidence
    const word =
      conf >= 70 ? 'yüksek' : conf >= 50 ? 'orta' : 'düşük'
    lines.push(`Yapay zekânın bu tahmine güveni %${conf} (${word}).`)
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span className="vbadge">Genel değerlendirme</span>
        <span className="muted" style={{ fontSize: 12 }}>
          {ai && dc
            ? 'AI tahmini + istatistiksel model'
            : ai
              ? 'AI tahmini'
              : 'istatistiksel model'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lines.map((line, i) => (
          <p
            key={i}
            className="muted"
            style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}
          >
            {line}
          </p>
        ))}
      </div>
      <p
        className="muted"
        style={{ margin: '10px 0 0', fontSize: 11, opacity: 0.7 }}
      >
        Bu özet, kartlardaki sayılardan otomatik üretilir. Bahis finansal tavsiye
        değildir.
      </p>
    </div>
  )
}
