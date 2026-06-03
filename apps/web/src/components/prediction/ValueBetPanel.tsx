'use client'

import { useState } from 'react'
import { Gem, Loader2, TrendingUp, AlertCircle } from 'lucide-react'
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
 * Premium value-bet panel: takes 1X2 decimal odds, calls the Dixon-Coles engine,
 * and surfaces +EV selections (model prob vs vig-free market) with a
 * quarter-Kelly stake. This is the differentiated paid feature.
 */
export function ValueBetPanel({
  fixtureId,
  homeTeam,
  awayTeam,
}: ValueBetPanelProps) {
  const { language } = useI18n()
  const { isAuthenticated } = useAuth()
  const dc = useDixonColes()

  const [home, setHome] = useState('')
  const [draw, setDraw] = useState('')
  const [away, setAway] = useState('')

  const tr = language === 'tr'
  const result = dc.data?.result
  const errCode = dc.error?.code

  const oddsValid = [home, draw, away].every((v) => {
    const n = parseFloat(v)
    return Number.isFinite(n) && n > 1
  })

  const analyze = () => {
    if (!oddsValid) return
    dc.mutate({
      fixtureId,
      odds: {
        home: parseFloat(home),
        draw: parseFloat(draw),
        away: parseFloat(away),
      },
    })
  }

  const selName = (s: ValueBet['selection']) =>
    s === 'home'
      ? homeTeam
      : s === 'away'
        ? awayTeam
        : tr
          ? 'Beraberlik'
          : 'Draw'

  const valueBets = (result?.value ?? []).filter((v) => v.is_value)

  return (
    <div className="neon-card rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
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
            Dixon-Coles · {tr ? 'istatistik modeli' : 'statistical model'} · 4
            cr
          </p>
        </div>
      </div>

      {!isAuthenticated ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {tr ? 'Değer analizi için giriş yapın.' : 'Sign in to analyze value.'}
        </div>
      ) : (
        <>
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

          <button
            onClick={analyze}
            disabled={!oddsValid || dc.isPending}
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

          {errCode && (
            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs">
              {errCode === 'insufficient_credits'
                ? tr
                  ? `Yetersiz kredi (gerekli: ${dc.error?.required ?? 4}).`
                  : `Insufficient credits (need ${dc.error?.required ?? 4}).`
                : errCode === 'insufficient_history' ||
                    errCode === 'teams_not_in_history'
                  ? tr
                    ? 'Bu maç için yeterli geçmiş veri yok.'
                    : 'Not enough historical data for this match.'
                  : tr
                    ? 'Analiz başarısız oldu.'
                    : 'Analysis failed.'}
            </div>
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
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge className="bg-emerald-500 text-white border-transparent shrink-0">
                          💎 VALUE
                        </Badge>
                        <span className="text-sm font-medium truncate">
                          {selName(v.selection)}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          @ {v.odds.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span className="text-sm font-bold tabular-nums">
                            +{(v.ev_per_unit * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground leading-tight text-right">
                          <div>stake %{(v.rec_kelly * 100).toFixed(1)}</div>
                          <div>
                            {tr ? 'model' : 'model'} %
                            {(v.model_prob * 100).toFixed(0)}
                          </div>
                        </div>
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
