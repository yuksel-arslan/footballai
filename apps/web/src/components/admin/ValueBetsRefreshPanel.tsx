'use client'

import { useState } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

interface RefreshResult {
  processed?: number
  valueBets?: number
  oddsMisses?: number
  fixturesFound?: number
}

/**
 * Admin control to recompute the value-bet cache. Cost-guarded server-side
 * (cooldown + fixture cap + odds caching); this just triggers it and shows the
 * summary. Used to populate the home + "Değerli Bahisler" lists.
 */
export function ValueBetsRefreshPanel() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (force: boolean) => {
    setBusy(true)
    setMsg(null)
    setError(null)
    try {
      const res = await fetch(
        `/api/predictions/value-bets/refresh${force ? '?force=1' : ''}`,
        { method: 'POST' }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          json?.error === 'cooldown_active'
            ? 'Bekleme süresi aktif (10 dk). "Zorla yenile" ile geçebilirsin.'
            : `Hata: ${json?.error ?? res.status}`
        )
      } else {
        const d = (json?.data ?? {}) as RefreshResult
        setMsg(
          `${d.valueBets ?? 0} değerli bahis bulundu · ${d.processed ?? 0}/${
            d.fixturesFound ?? 0
          } maç işlendi · ${d.oddsMisses ?? 0} oran yok`
        )
        qc.invalidateQueries({ queryKey: ['value-bets'] })
      }
    } catch {
      setError('Servis yanıt vermedi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="neon-card rounded-xl p-4 border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <RefreshCw className="w-4 h-4 text-[#22D3EE]" />
        <h3 className="text-sm font-semibold">Değer Motoru</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Yaklaşan maçlar için Dixon-Coles değer bahislerini hesaplar ve önbelleğe
        alır (oran kotasını korumak için sınırlı + 10 dk bekleme).
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => run(false)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #00E07A, #22D3EE)' }}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Değer bahislerini hesapla
        </button>
        <button
          onClick={() => run(true)}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-white/10 hover:bg-white/5 disabled:opacity-60"
        >
          Zorla yenile
        </button>
      </div>
      {msg && <p className="text-xs text-[#10B981] mt-3">{msg}</p>}
      {error && <p className="text-xs text-[#F4607A] mt-3">{error}</p>}
    </div>
  )
}
