'use client'

import { useState, useEffect } from 'react'
import { Gem, Loader2, TrendingUp, AlertCircle, Pencil } from 'lucide-react'
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
            <h3 className="font-semibold text-sm">
              {tr ? 'Değer Bahsi' : 'Value Bet'}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Dixon-Coles · {tr ? 'oranlar otomatik' : 'auto odds'} · 4 cr
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

      {!isAuthenticated ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {tr ? 'Değer analizi için giriş yapın.' : 'Sign in to analyze value.'}
        </div>
      ) : (
        <>
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
                    placeholder="1.00"
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
              'Değer analizi (4 cr)'
            ) : (
              'Analyze value (4 cr)'
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
              </div>
            )
          )}

          {result && (
            <div className="mt-4 space-y-3">
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
