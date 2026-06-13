'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Gem, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ValueBet, DixonColesResult } from '@/hooks/use-dixon-coles'

/**
 * Automatic "Değer Sinyali" card for the free product: the Dixon-Coles
 * statistical model's probability distribution and value signals, computed
 * automatically server-side (same engine as the value list) and shown
 * read-only — no manual odds entry, no button, no credits.
 */
export function AutoValueSignal({
  fixtureId,
  homeTeam,
  awayTeam,
  onResult,
}: {
  fixtureId: number
  homeTeam: string
  awayTeam: string
  onResult?: (r: DixonColesResult) => void
}) {
  const { data, isLoading, isError } = useQuery<DixonColesResult | null>({
    queryKey: ['auto-value', fixtureId],
    queryFn: async () => {
      const res = await fetch(`/api/predictions/dixon-coles/${fixtureId}`)
      const json = await res.json().catch(() => null)
      return json?.success ? (json.data as DixonColesResult) : null
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  useEffect(() => {
    if (data) onResult?.(data)
  }, [data, onResult])

  const selName = (s: ValueBet['selection']) =>
    s === 'home' ? homeTeam : s === 'away' ? awayTeam : 'Beraberlik'

  const Header = (
    <div className="flex items-center gap-2 mb-4">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: 'rgba(16, 185, 129, 0.12)' }}
      >
        <Gem className="w-4 h-4 text-emerald-500" />
      </div>
      <div>
        <h3 className="font-semibold text-sm">Değer Sinyali</h3>
        <p className="text-[10px] text-muted-foreground">
          Dixon-Coles · otomatik hesaplanır
        </p>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="neon-card rounded-xl p-4 sm:p-5">
        {Header}
        <p className="text-xs text-muted-foreground">Hesaplanıyor…</p>
      </div>
    )
  }

  if (isError || !data || !data.probabilities) {
    return (
      <div className="neon-card rounded-xl p-4 sm:p-5">
        {Header}
        <p className="text-xs text-muted-foreground">
          Bu maç için değer sinyali henüz hazır değil — yeterli geçmiş veri
          oluştuğunda otomatik görünür.
        </p>
      </div>
    )
  }

  const p = data.probabilities
  const allSignals = data.value ?? []
  const valueSignals = allSignals.filter((v) => v.is_value)

  return (
    <div className="neon-card rounded-xl p-4 sm:p-5">
      {Header}

      {data.oddsSource === 'ai' && (
        <div className="mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] leading-relaxed">
          Bu maç için piyasa henüz açılmadı; değer sinyali AI tahmini adil
          oranlara göre hesaplandı — yön gösterir.
        </div>
      )}

      <div className="space-y-3">
        {/* Live banner */}
        {data.live && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-[11px] leading-relaxed">
            <b>Canlı:</b> Olasılıklar {data.live.minute}&apos;. dakika ve{' '}
            {data.live.home_goals}-{data.live.away_goals} skoru dikkate alınarak{' '}
            <b>maç sonu</b> için hesaplandı.
          </div>
        )}

        {/* 1X2 */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {(
            [
              ['1', p.home_win],
              ['X', p.draw],
              ['2', p.away_win],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="rounded-lg bg-muted/40 py-2">
              <div className="text-[10px] text-muted-foreground">{label}</div>
              <div className="text-sm font-semibold tabular-nums">
                %{(v * 100).toFixed(0)}
              </div>
            </div>
          ))}
        </div>

        {/* Goal markets */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {(
            [
              ['Üst 2.5', p.over_2_5],
              ['Alt 2.5', p.under_2_5],
              ['KG Var', p.btts_yes],
            ] as const
          ).map(([label, v]) =>
            Number.isFinite(v) ? (
              <div key={label} className="rounded-lg bg-muted/40 py-2">
                <div className="text-[10px] text-muted-foreground">{label}</div>
                <div className="text-sm font-semibold tabular-nums">
                  %{(v * 100).toFixed(0)}
                </div>
              </div>
            ) : null
          )}
        </div>

        {/* Likely scorelines */}
        {p.top_scorelines?.length > 0 && (
          <div className="flex items-center justify-center gap-2 flex-wrap text-[11px]">
            <span className="text-muted-foreground">En olası skorlar:</span>
            {p.top_scorelines.slice(0, 3).map((s) => (
              <span
                key={`${s.home}-${s.away}`}
                className="px-2 py-0.5 rounded-md bg-muted/50 font-semibold tabular-nums"
              >
                {s.home}-{s.away}{' '}
                <span className="text-muted-foreground font-normal">
                  %{(s.prob * 100).toFixed(0)}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Value signals */}
        {valueSignals.length > 0 ? (
          <div className="space-y-2">
            {valueSignals.map((v) => (
              <div
                key={v.selection}
                className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
              >
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500 text-white border-transparent shrink-0">
                    DEĞER
                  </Badge>
                  <span className="text-sm font-medium truncate min-w-0">
                    {selName(v.selection)}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 shrink-0 ml-auto">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-sm font-bold tabular-nums">
                      +{(v.edge * 100).toFixed(1)}% avantaj
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                  <span>model %{(v.model_prob * 100).toFixed(0)}</span>
                  <span>
                    piyasa %{(v.market_prob_vigfree * 100).toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground text-center">
            Bu olasılıklarda öne çıkan bir değer sinyali yok — model ve piyasa
            uyumlu.
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/70 text-center">
          Otomatik hesaplanır. Yalnızca bilgilendirme amaçlıdır; tavsiye
          niteliği taşımaz.
        </p>
      </div>
    </div>
  )
}
