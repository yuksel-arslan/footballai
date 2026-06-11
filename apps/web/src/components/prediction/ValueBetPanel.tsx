'use client'

import { useState, useEffect } from 'react'
import {
  Gem,
  Loader2,
  TrendingUp,
  AlertCircle,
  Pencil,
  Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth/use-auth'
import { useDixonColes, type ValueBet } from '@/hooks/use-dixon-coles'

interface ValueBetPanelProps {
  fixtureId: number
  homeTeam: string
  awayTeam: string
}

/**
 * Premium value-bet panel. Odds are fetched automatically from API-Football for
 * the fixture; the user just clicks "Analyze". If odds aren't available it falls
 * back to manual 1X2 entry. Surfaces +EV selections (model prob vs vig-free
 * market) with a quarter-Kelly stake — the differentiated paid feature.
 */
export function ValueBetPanel({
  fixtureId,
  homeTeam,
  awayTeam,
}: ValueBetPanelProps) {
  const { language } = useI18n()
  const { isAuthenticated } = useAuth()
  const dc = useDixonColes()

  const [manual, setManual] = useState(false)
  const [info, setInfo] = useState(false)
  const [home, setHome] = useState('')
  const [draw, setDraw] = useState('')
  const [away, setAway] = useState('')

  const tr = language === 'tr'
  const result = dc.data?.result
  const errCode = dc.error?.code

  // If auto odds weren't available, drop into manual-entry mode.
  useEffect(() => {
    if (errCode === 'odds_unavailable') setManual(true)
  }, [errCode])

  const manualOddsValid = [home, draw, away].every((v) => {
    const n = parseFloat(v)
    return Number.isFinite(n) && n > 1
  })
  const canSubmit = !dc.isPending && (!manual || manualOddsValid)

  const analyze = () => {
    if (!canSubmit) return
    if (manual) {
      dc.mutate({
        fixtureId,
        home: homeTeam,
        away: awayTeam,
        odds: {
          home: parseFloat(home),
          draw: parseFloat(draw),
          away: parseFloat(away),
        },
      })
    } else {
      dc.mutate({ fixtureId, home: homeTeam, away: awayTeam })
    }
  }

  const selName = (s: ValueBet['selection']) =>
    s === 'home'
      ? homeTeam
      : s === 'away'
        ? awayTeam
        : tr
          ? 'Beraberlik'
          : 'Draw'

  const allBets = result?.value ?? []
  const valueBets = allBets.filter((v) => v.is_value)

  /**
   * Plain-language verdict built from the numbers, so a user who can't read
   * probabilities/EV/Kelly still walks away with a conclusion. Deterministic —
   * no extra AI call, no extra credits.
   */
  const buildSummary = (): string[] => {
    if (!result) return []
    const p = result.probabilities
    const lines: string[] = []

    // 1) Who's favored, and how strongly.
    const outcomes = [
      { key: 'home' as const, prob: p.home_win, name: homeTeam },
      { key: 'draw' as const, prob: p.draw, name: 'Beraberlik' },
      { key: 'away' as const, prob: p.away_win, name: awayTeam },
    ].sort((a, b) => b.prob - a.prob)
    const top = outcomes[0]
    const pct = Math.round(top.prob * 100)
    if (top.key === 'draw') {
      lines.push(
        `Model bu maçta net bir favori görmüyor; en olası sonuç beraberlik (%${pct}).`
      )
    } else if (top.prob >= 0.55) {
      lines.push(`Model ${top.name} takımını net favori görüyor (%${pct}).`)
    } else if (top.prob >= 0.45) {
      lines.push(`Model ${top.name} tarafını önde görüyor (%${pct}).`)
    } else {
      lines.push(
        `Dengeli bir maç: ${top.name} hafif önde (%${pct}) ama fark küçük, her sonuç mümkün.`
      )
    }

    // 2) Goals expectation when the model returned it.
    const xh = p.expected_home_goals
    const xa = p.expected_away_goals
    if (Number.isFinite(xh) && Number.isFinite(xa)) {
      const totalGoals = xh + xa
      const goalText =
        totalGoals >= 3
          ? 'gollü bir maç bekleniyor'
          : totalGoals >= 2.2
            ? 'orta tempolu, 2-3 gollü bir maç bekleniyor'
            : 'az gollü, kontrollü bir maç bekleniyor'
      lines.push(
        `Beklenen skor yaklaşık ${xh.toFixed(1)} - ${xa.toFixed(1)}; ${goalText}.`
      )
    }

    // 3) The verdict: is there a bet worth taking, or not.
    if (valueBets.length > 0) {
      const best = [...valueBets].sort((a, b) => b.edge - a.edge)[0]
      const name = selName(best.selection)
      const modelPct = Math.round(best.model_prob * 100)
      const marketPct = Math.round(best.market_prob_vigfree * 100)
      const stake = (best.rec_kelly * 100).toFixed(1)
      lines.push(
        `Sonuç: ${name} seçeneğinde matematiksel avantaj var. Model bu sonucu %${modelPct} olası görüyor, oran ise %${marketPct}'lik bir ihtimali fiyatlıyor — yani oran olması gerekenden cömert. Bahis düşünüyorsanız kasanızın ~%${stake}'i ile sınırlı kalın.`
      )
      if (result.oddsSource === 'ai') {
        lines.push(
          'Not: Bu hesap AI tahmini oranlarla yapıldı; piyasa açılınca gerçek oranlarla tekrar bakın.'
        )
      }
    } else {
      lines.push(
        'Sonuç: Bu oranlarda matematiksel avantaj yok — oranlar modelin beklentisiyle uyumlu. Bu maçta bahsi geçmek en mantıklı tercih.'
      )
    }

    return lines
  }
  const summary = buildSummary()

  return (
    <div className="neon-card rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(16, 185, 129, 0.12)' }}
          >
            <Gem className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              {tr ? 'Değer Bahsi' : 'Value Bet'}
              <button
                type="button"
                onClick={() => setInfo((v) => !v)}
                aria-label={tr ? 'Bilgi' : 'Info'}
                className="text-muted-foreground hover:text-emerald-500 transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Dixon-Coles · {tr ? 'oranlar otomatik' : 'auto odds'} · 4 kredi
            </p>
          </div>
        </div>
        {isAuthenticated && (
          <button
            onClick={() => setManual((m) => !m)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3 h-3" />
            {manual ? (tr ? 'otomatik' : 'auto') : tr ? 'elle gir' : 'manual'}
          </button>
        )}
      </div>

      {info && (
        <div className="mb-4 p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground leading-relaxed space-y-2">
          <p>
            <strong className="text-foreground">Değer bahsi (value bet)</strong>{' '}
            nedir? Modelin bir sonuca verdiği olasılık, bahis oranının ima
            ettiği olasılıktan <em>yüksekse</em> orada “değer” vardır — yani
            oran olması gerekenden cömerttir. Uzun vadede kâr, bu farkı (edge)
            yakalamaktan gelir.
          </p>
          <p>
            <strong className="text-foreground">Değer Analizi</strong> ne yapar?
            Dixon-Coles modeli 1-X-2 olasylıklarını hesaplar, bahis oranlarıyla
            karşılaştırır ve pozitif değer (+EV) olan seçimleri çeyrek-Kelly
            stake önerisiyle gösterir.
          </p>
          <p>
            <strong className="text-foreground">AI tahmini</strong> ile farkı:
            AI tahmini “kim kazanır” sorusuna sezgisel, açıklamalı bir cevap
            verir. Değer Analizi ise sayısal/istatistikseldir ve{' '}
            <em>orana karşı</em> avantaj arar. İkisi birbirini tamamlar: AI
            yönü, Değer Analizi bahsin matematiksel mantığını verir.
          </p>
          <div className="p-2 rounded bg-background/60">
            <p className="text-foreground font-medium mb-1">Örnek</p>
            <p>
              Model: Ev sahibi kazanır = %50. Bahis sitesi oranı = 2.40 (ima
              edilen olasılık ≈ %42). Model %50 &gt; piyasa %42 →{' '}
              <b>değer var</b>. +EV ≈ %20, önerilen stake bankroll’un ~%5’i.
              Oran 1.80 olsaydı (ima %56 &gt; %50) değer olmazdı, geçilirdi.
            </p>
          </div>
          <p>
            Gerçek bahiste: bahis sitesindeki güncel oranı girin, “VALUE”
            etiketli seçimleri ve önerilen stake’i değerlendirin. Bahis finansal
            tavsiye değildir; sorumlu oynayın.
          </p>
        </div>
      )}

      {!isAuthenticated ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {tr ? 'Değer analizi için giriş yapın.' : 'Sign in to analyze value.'}
        </div>
      ) : (
        <>
          {manual ? (
            <div className="mb-3 p-2.5 rounded-lg bg-muted/40 text-[11px] text-muted-foreground leading-relaxed">
              {tr
                ? 'Bahis sitesindeki gerçek ondalık oranları girin (ör. 1.50 / 3.80 / 6.50). Oran, modelin olasılığıyla karşılaştırılıp değer hesaplanır — uydurma değer girilirse sonuç anlamsız olur.'
                : 'Enter the real decimal odds from a bookmaker (e.g. 1.50 / 3.80 / 6.50). The odds are compared with the model probability to compute value — made-up odds give meaningless results.'}
            </div>
          ) : (
            <div className="mb-3 p-2.5 rounded-lg bg-muted/40 text-[11px] text-muted-foreground leading-relaxed">
              {tr
                ? 'Oranlar bahis sağlayıcısından otomatik çekilir. Piyasa henüz açılmadıysa (turnuva/ileri tarihli maçlar) yerine AI tahmini adil oran kullanılır. Gerçek oranınız varsa "elle gir" ile girebilirsiniz.'
                : 'Odds are fetched automatically from the market. If none are posted yet (tournaments / far-off matches), AI-estimated fair odds are used instead. Have your own odds? Use “manual”.'}
            </div>
          )}

          {manual && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: '1', v: home, set: setHome },
                { label: 'X', v: draw, set: setDraw },
                { label: '2', v: away, set: setAway },
              ].map((f) => (
                <label key={f.label} className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground text-center">
                    {f.label}
                  </span>
                  <input
                    inputMode="decimal"
                    value={f.v}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder="1.50"
                    className="w-full px-2 py-1.5 rounded-lg border border-border bg-card text-center text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </label>
              ))}
            </div>
          )}

          <button
            onClick={analyze}
            disabled={!canSubmit}
            className="w-full py-2 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            {dc.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {tr ? 'Analiz ediliyor…' : 'Analyzing…'}
              </span>
            ) : tr ? (
              'Değer analizi (4 kredi)'
            ) : (
              'Analyze value (4 credits)'
            )}
          </button>

          {errCode === 'odds_unavailable' ? (
            <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs">
              {tr
                ? 'Oranlar otomatik bulunamadı — lütfen elle girin.'
                : 'Odds not available automatically — please enter them manually.'}
            </div>
          ) : (
            errCode && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs">
                {errCode === 'insufficient_credits'
                  ? tr
                    ? `Yetersiz kredi (gerekli: ${dc.error?.required ?? 4}).`
                    : `Insufficient credits (need ${dc.error?.required ?? 4}).`
                  : errCode === 'history_building'
                    ? tr
                      ? 'Geçmiş maç verileri hazırlanıyor — birkaç dakika sonra tekrar deneyin.'
                      : 'Match history is being prepared — try again in a few minutes.'
                    : errCode === 'insufficient_history' ||
                        errCode === 'teams_not_in_history'
                      ? tr
                        ? 'Bu maç için yeterli geçmiş veri yok.'
                        : 'Not enough historical data for this match.'
                      : tr
                        ? `Analiz başarısız oldu (${errCode}).`
                        : `Analysis failed (${errCode}).`}
                {dc.error?.detail &&
                  dc.error.detail !== errCode &&
                  errCode !== 'insufficient_credits' &&
                  errCode !== 'history_building' &&
                  errCode !== 'insufficient_history' &&
                  errCode !== 'teams_not_in_history' && (
                    <div className="mt-1 text-[10px] opacity-70 break-words">
                      {dc.error.detail}
                    </div>
                  )}
              </div>
            )
          )}

          {result && (
            <div className="mt-4 space-y-3">
              {/* AI-estimated odds notice — market not posted yet */}
              {result.oddsSource === 'ai' && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] leading-relaxed">
                  {tr
                    ? 'Bu maç için bahis piyasası henüz açılmadı; oranlar AI tarafından tahmin edildi. Buradaki “değer”, gerçek piyasaya değil AI’nın adil oran tahminine göredir — yön gösterir. Piyasa açıldığında gerçek oranlarla (“elle gir”) tekrar bakın.'
                    : 'The betting market for this match is not open yet; odds were AI-estimated. The “value” here is against an AI fair line, not a real market — treat it as indicative. Re-check with real odds (“manual”) once the market opens.'}
                </div>
              )}
              {/* Model probabilities */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {(
                  [
                    ['1', result.probabilities.home_win],
                    ['X', result.probabilities.draw],
                    ['2', result.probabilities.away_win],
                  ] as const
                ).map(([label, p]) => (
                  <div key={label} className="rounded-lg bg-muted/40 py-2">
                    <div className="text-[10px] text-muted-foreground">
                      {label}
                    </div>
                    <div className="text-sm font-semibold tabular-nums">
                      %{(p * 100).toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Value bets */}
              {valueBets.length > 0 ? (
                <div className="space-y-2">
                  {valueBets.map((v) => (
                    <div
                      key={v.selection}
                      className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
                    >
                      {/* Line 1: pick + odds + EV */}
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500 text-white border-transparent shrink-0">
                          💎 VALUE
                        </Badge>
                        <span className="text-sm font-medium truncate min-w-0">
                          {selName(v.selection)}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                          @ {v.odds.toFixed(2)}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span className="text-sm font-bold tabular-nums">
                            +{(v.ev_per_unit * 100).toFixed(1)}%
                          </span>
                        </span>
                      </div>
                      {/* Line 2: stake + model */}
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>stake %{(v.rec_kelly * 100).toFixed(1)}</span>
                        <span>model %{(v.model_prob * 100).toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground text-center">
                  {tr
                    ? 'Bu oranlarda değer bahsi yok — piyasa verimli.'
                    : 'No value at these odds — the market is efficient.'}
                </div>
              )}

              {/* Plain-language verdict */}
              {summary.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] leading-relaxed space-y-1.5">
                  <p className="text-foreground font-medium text-xs">
                    {tr ? 'Özet yorum' : 'Summary'}
                  </p>
                  {summary.map((line, i) => (
                    <p key={i} className="text-muted-foreground">
                      {line}
                    </p>
                  ))}
                </div>
              )}

              {/* Odds used */}
              {allBets.length > 0 && (
                <div className="flex justify-center gap-3 text-[10px] text-muted-foreground">
                  {allBets.map((b) => (
                    <span key={b.selection}>
                      {b.selection === 'home'
                        ? '1'
                        : b.selection === 'draw'
                          ? 'X'
                          : '2'}{' '}
                      {b.odds.toFixed(2)}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-muted-foreground/70 text-center">
                {tr
                  ? 'Çeyrek-Kelly stake (bankroll %). Bahis finansal tavsiye değildir.'
                  : 'Quarter-Kelly stake (% of bankroll). Not financial advice.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
