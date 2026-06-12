'use client'

import { useTeamHistory, type TeamHistory } from '@/hooks/use-team-history'
import { useH2H } from '@/hooks/use-match-detail'
import { Crest } from '@/components/app/crest'

const PIP: Record<string, { cls: string; ch: string }> = {
  W: { cls: 'pip-w', ch: 'G' },
  D: { cls: 'pip-d', ch: 'B' },
  L: { cls: 'pip-l', ch: 'M' },
}

function FormPips({ form }: { form: ('W' | 'D' | 'L')[] }) {
  if (!form.length) return <span className="muted">—</span>
  return (
    <span className="form-pips">
      {form.map((r, i) => {
        const p = PIP[r] ?? PIP.D
        return (
          <span key={i} className={`pip ${p.cls}`}>
            {p.ch}
          </span>
        )
      })}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="vstat">
      <div className="l">{label}</div>
      <div className="v">{value}</div>
    </div>
  )
}

function HistoryCard({ h }: { h: TeamHistory }) {
  return (
    <div className="card">
      <div className="card-h">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Crest
            team={{
              id: h.team.id,
              name: h.team.name,
              logoUrl: h.team.logoUrl ?? undefined,
            }}
          />
          <h3>{h.team.name}</h3>
        </div>
        <span className="hint">son {h.played} maç</span>
      </div>

      {h.played === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          Bu takımın maçları arşive eklendikçe geçmişi burada görünecek.
        </p>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <span className="muted" style={{ fontSize: 12 }}>
              Form
            </span>
            <FormPips form={h.form} />
            <span className="edge-pill sm" style={{ marginLeft: 'auto' }}>
              %{h.winRate} galibiyet
            </span>
          </div>

          <div
            className="vmeta"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))',
              gap: 12,
            }}
          >
            <Stat label="G-B-M" value={`${h.wins}-${h.draws}-${h.losses}`} />
            <Stat label="Att gol (maç)" value={h.avgGoalsFor} />
            <Stat label="Yenen gol (maç)" value={h.avgGoalsAgainst} />
            <Stat label="Gol (A/Y)" value={`${h.goalsFor}/${h.goalsAgainst}`} />
            <Stat label="Gol yemediği" value={h.cleanSheets} />
            <Stat label="KG Var" value={`%${h.bttsRate}`} />
          </div>

          {h.recent.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                Son maçlar
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {h.recent.map((m) => {
                  const p = PIP[m.result] ?? PIP.D
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 13,
                      }}
                    >
                      <span className={`pip ${p.cls}`}>{p.ch}</span>
                      <span
                        style={{ flex: 1, minWidth: 0 }}
                        className="truncate"
                      >
                        {m.isHome ? '(E) ' : '(D) '}
                        {m.opponent}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {m.gf}-{m.ga}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function H2HCard({
  homeId,
  awayId,
  homeName,
  awayName,
}: {
  homeId: number
  awayId: number
  homeName: string
  awayName: string
}) {
  // h2h endpoint treats team1=home, team2=away; pass names so it resolves
  // teams reliably (ids from the displayed fixture may be foreign-provider).
  const { data } = useH2H(homeId, awayId, homeName, awayName)
  const s = data?.summary
  const history = data?.history ?? []
  if (!s && history.length === 0) return null

  const total = s?.totalGames ?? 0
  const homeW = s?.team1Wins ?? 0
  const awayW = s?.team2Wins ?? 0
  const draws = s?.draws ?? 0
  const pctW = total ? (homeW / total) * 100 : 0
  const pctD = total ? (draws / total) * 100 : 0
  const pctA = total ? (awayW / total) * 100 : 0

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-h">
        <h3>Aralarındaki maçlar (H2H)</h3>
        <span className="hint">{total} karşılaşma</span>
      </div>

      {total > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            <span>
              {homeName}: <b>{homeW}</b>
            </span>
            <span className="muted">Beraberlik: {draws}</span>
            <span>
              {awayName}: <b>{awayW}</b>
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              height: 8,
              borderRadius: 999,
              overflow: 'hidden',
              marginBottom: 14,
            }}
          >
            <span
              style={{ width: `${pctW}%`, background: 'var(--c1, #00E07A)' }}
            />
            <span
              style={{ width: `${pctD}%`, background: 'var(--raise, #555)' }}
            />
            <span
              style={{ width: `${pctA}%`, background: 'var(--c2, #22D3EE)' }}
            />
          </div>
        </>
      )}

      {history.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {history.slice(0, 6).map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
              }}
            >
              <span
                className="truncate"
                style={{ flex: 1, textAlign: 'right' }}
              >
                {m.homeTeam.name}
              </span>
              <span
                style={{
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: 44,
                  textAlign: 'center',
                }}
              >
                {m.homeScore}-{m.awayScore}
              </span>
              <span className="truncate" style={{ flex: 1 }}>
                {m.awayTeam.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Two side-by-side team "history" cards (form, goal averages, win rate,
 * clean sheets, BTTS, recent matches) plus an H2H card, shown below the
 * match analysis. Stats are derived from finished fixtures, so they work
 * for any imported team including national sides.
 */
export function TeamHistoryCards({
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
}: {
  homeTeamId?: number
  awayTeamId?: number
  homeTeamName?: string
  awayTeamName?: string
}) {
  const home = useTeamHistory(homeTeamId, homeTeamName)
  const away = useTeamHistory(awayTeamId, awayTeamName)

  if (home.isLoading || away.isLoading) {
    return (
      <div className="card" style={{ marginTop: 16 }}>
        <p className="muted" style={{ margin: 0 }}>
          Geçmiş istatistikler yükleniyor…
        </p>
      </div>
    )
  }
  if (!home.data && !away.data) return null

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card-h" style={{ marginBottom: 12 }}>
        <h3>Geçmiş istatistikler</h3>
        <span className="hint">son maçlar</span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {home.data && <HistoryCard h={home.data} />}
        {away.data && <HistoryCard h={away.data} />}
      </div>

      {homeTeamId && awayTeamId && (
        <H2HCard
          homeId={homeTeamId}
          awayId={awayTeamId}
          homeName={homeTeamName ?? home.data?.team.name ?? 'Ev'}
          awayName={awayTeamName ?? away.data?.team.name ?? 'Deplasman'}
        />
      )}
    </div>
  )
}
