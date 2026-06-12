'use client'

import { useQuery } from '@tanstack/react-query'

/**
 * Measured pre-match power & form comparison — not opinions, computed from
 * the archive: time-decayed attack/defence strength indices (Dixon-Coles
 * family), opponent-adjusted form score (0-100), and each side's key players
 * (goals/assists/cards from match events).
 */

interface PlayerStat {
  player: string
  goals: number
  penalties: number
  assists: number
  yellows: number
  reds: number
  matches: number
}
interface SideAnalytics {
  team: string
  matches: number
  attack: number
  defence: number
  overall: number
  form: number
  rank?: number
  players: PlayerStat[]
}

function useMatchupAnalytics(
  leagueApiId: number | undefined,
  home: string,
  away: string
) {
  return useQuery<{ home: SideAnalytics | null; away: SideAnalytics | null }>({
    queryKey: ['analytics', leagueApiId, home, away],
    enabled: !!leagueApiId && !!home && !!away,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(
        `/api/analytics?league=${leagueApiId}&home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}`
      )
      if (!res.ok) throw new Error('analytics_failed')
      const json = (await res.json()) as {
        data?: { home: SideAnalytics | null; away: SideAnalytics | null }
      }
      return json.data ?? { home: null, away: null }
    },
  })
}

function Bar({
  leftVal,
  rightVal,
  label,
  fmt,
}: {
  leftVal: number
  rightVal: number
  label: string
  fmt: (n: number) => string
}) {
  const total = leftVal + rightVal || 1
  const leftPct = Math.round((leftVal / total) * 100)
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          marginBottom: 3,
        }}
      >
        <b className="tabular-nums">{fmt(leftVal)}</b>
        <span className="muted" style={{ fontSize: 11 }}>
          {label}
        </span>
        <b className="tabular-nums">{fmt(rightVal)}</b>
      </div>
      <div
        style={{
          display: 'flex',
          height: 7,
          borderRadius: 99,
          overflow: 'hidden',
          background: 'var(--line2)',
        }}
      >
        <span
          style={{
            width: `${leftPct}%`,
            background: 'var(--c1, #10b981)',
          }}
        />
        <span style={{ flex: 1, background: 'var(--c2, #22d3ee)' }} />
      </div>
    </div>
  )
}

function KeyPlayers({ side }: { side: SideAnalytics }) {
  if (side.players.length === 0) return null
  return (
    <div style={{ fontSize: 12, lineHeight: 1.7 }}>
      {side.players.slice(0, 3).map((p) => (
        <div key={p.player} className="muted">
          <b style={{ color: 'var(--txt)' }}>{p.player}</b> — {p.goals} gol
          {p.assists > 0 ? `, ${p.assists} asist` : ''}
          {p.reds > 0 ? ` · 🟥${p.reds}` : ''}
        </div>
      ))}
    </div>
  )
}

export function PowerAnalysis({
  leagueApiId,
  homeTeam,
  awayTeam,
}: {
  leagueApiId?: number
  homeTeam: string
  awayTeam: string
}) {
  const { data, isLoading } = useMatchupAnalytics(
    leagueApiId,
    homeTeam,
    awayTeam
  )
  const h = data?.home
  const a = data?.away
  if (isLoading || !h || !a) return null // measured-only: no data, no card

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-h">
        <h3>Güç &amp; Form Analizi</h3>
        <span className="hint">arşivden ölçülen · görüş değil</span>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12.5,
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        <span>
          {h.team}
          {h.rank ? (
            <span className="muted" style={{ fontWeight: 500 }}>
              {' '}
              · güç sırası #{h.rank}
            </span>
          ) : null}
        </span>
        <span style={{ textAlign: 'right' }}>
          {a.team}
          {a.rank ? (
            <span className="muted" style={{ fontWeight: 500 }}>
              {' '}
              · #{a.rank}
            </span>
          ) : null}
        </span>
      </div>

      <Bar
        leftVal={h.overall}
        rightVal={a.overall}
        label="Genel güç (0-100)"
        fmt={(n) => String(n)}
      />
      <Bar
        leftVal={h.form}
        rightVal={a.form}
        label="Form puanı (rakip-düzeltmeli)"
        fmt={(n) => String(n)}
      />
      <Bar
        leftVal={h.attack}
        rightVal={a.attack}
        label="Hücum endeksi (1.00 = ortalama)"
        fmt={(n) => n.toFixed(2)}
      />
      <Bar
        leftVal={h.defence}
        rightVal={a.defence}
        label="Savunma endeksi (1.00 = ortalama)"
        fmt={(n) => n.toFixed(2)}
      />

      {(h.players.length > 0 || a.players.length > 0) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--line2)',
          }}
        >
          <div>
            <div
              className="muted"
              style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}
            >
              Kilit oyuncular
            </div>
            <KeyPlayers side={h} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              className="muted"
              style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}
            >
              Kilit oyuncular
            </div>
            <KeyPlayers side={a} />
          </div>
        </div>
      )}

      <p className="muted" style={{ margin: '12px 0 0', fontSize: 10.5, opacity: 0.7 }}>
        Endeksler {h.matches}+{a.matches} arşiv maçından üssel zaman-azaltımıyla
        (yarı ömür ~90 gün) hesaplanır; form, rakip gücüne göre düzeltilir.
        Oyuncu verileri maç olaylarından (gol/asist/kart) sayılır.
      </p>
    </div>
  )
}
