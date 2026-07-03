'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Trophy } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface AdminLeague {
  id: number
  apiId: number
  name: string
  country: string
  logoUrl: string | null
  season: number
  active: boolean
}

/**
 * Admin panel to switch which leagues/tournaments the system operates on.
 * Passive leagues are hidden from public lists and excluded from activity.
 * This is the SOLE control over what appears — competition visibility is fully
 * manual; nothing activates or deactivates on its own.
 */
export function LeagueActivityPanel() {
  const { language } = useI18n()
  const tr = language === 'tr'

  const [leagues, setLeagues] = useState<AdminLeague[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/leagues')
      if (!res.ok) {
        setError(
          res.status === 403
            ? tr
              ? 'Yetki yok (admin gerekli).'
              : 'Forbidden (admin required).'
            : tr
              ? 'Ligler yüklenemedi.'
              : 'Failed to load leagues.'
        )
        setLeagues([])
        return
      }
      const json = await res.json()
      setLeagues(json.data ?? [])
    } catch {
      setError(tr ? 'Ligler yüklenemedi.' : 'Failed to load leagues.')
    } finally {
      setLoading(false)
    }
  }, [tr])

  useEffect(() => {
    load()
  }, [load])

  const toggle = async (lg: AdminLeague) => {
    const next = !lg.active
    setSavingId(lg.id)
    setLeagues((arr) =>
      arr.map((x) => (x.id === lg.id ? { ...x, active: next } : x))
    )
    try {
      const res = await fetch('/api/admin/leagues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lg.id, active: next }),
      })
      if (!res.ok) throw new Error('patch failed')
    } catch {
      // revert on failure
      setLeagues((arr) =>
        arr.map((x) => (x.id === lg.id ? { ...x, active: !next } : x))
      )
    } finally {
      setSavingId(null)
    }
  }

  const filtered = leagues.filter(
    (l) =>
      !query ||
      l.name.toLowerCase().includes(query.toLowerCase()) ||
      l.country.toLowerCase().includes(query.toLowerCase())
  )
  const activeCount = leagues.filter((l) => l.active).length

  return (
    <div className="neon-card rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-[#00E07A]" />
        <h3 className="font-semibold">
          {tr ? 'Lig & Turnuva Aktiflik Kontrolü' : 'Competition Activity'}
        </h3>
        {!loading && !error && (
          <span className="text-xs text-muted-foreground ml-auto">
            {activeCount}/{leagues.length} {tr ? 'aktif' : 'active'}
          </span>
        )}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={
          tr ? 'Lig / turnuva / ülke ara…' : 'Search competition or country…'
        }
        className="w-full mb-3 px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-[#00E07A] transition-colors"
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#00E07A]" />
        </div>
      ) : error ? (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground text-center">
          {leagues.length === 0
            ? tr
              ? 'Henüz lig yok — fixtures sync sonrası dolacak.'
              : 'No leagues yet — populated after fixtures sync.'
            : tr
              ? 'Eşleşen lig yok.'
              : 'No matching leagues.'}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[28rem] overflow-y-auto pr-1">
          {filtered.map((lg) => (
            <div
              key={lg.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{lg.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {lg.country} · {lg.season}
                </div>
              </div>
              <button
                onClick={() => toggle(lg)}
                disabled={savingId === lg.id}
                role="switch"
                aria-checked={lg.active}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                  lg.active ? 'bg-emerald-500' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    lg.active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span
                className={`text-[10px] w-12 text-right ${
                  lg.active ? 'text-emerald-500' : 'text-muted-foreground'
                }`}
              >
                {lg.active
                  ? tr
                    ? 'aktif'
                    : 'active'
                  : tr
                    ? 'pasif'
                    : 'passive'}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] text-muted-foreground/70">
        {tr
          ? 'Hangi liglerin görüneceğini yalnızca sen belirlersin. Aktif ettiklerin herkese açık listelerde görünür; pasif olanlar gizlenir. Otomatik sezon/turnuva davranışı yoktur — seçimin kalıcıdır.'
          : 'You decide which competitions appear. Active ones show in the public lists; passive ones are hidden. There is no automatic season/tournament behavior — your selection is permanent.'}
      </p>
    </div>
  )
}
