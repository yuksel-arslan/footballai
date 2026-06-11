'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LEAGUES, type Standing, ApiConfigError } from '@/lib/api'
import { useStandings } from '@/hooks/use-fixtures'
import { Crest } from '@/components/app/crest'

const leagueList = Object.entries(LEAGUES).map(([code, league]) => ({
  code,
  ...league,
}))

const FORM_TR: Record<string, { cls: string; ch: string }> = {
  W: { cls: 'pip-w', ch: 'G' },
  D: { cls: 'pip-d', ch: 'B' },
  L: { cls: 'pip-l', ch: 'M' },
}

function zoneClass(position: number, total: number): string {
  if (position <= 4) return 'zone-ucl'
  if (position === 5) return 'zone-uel'
  if (position > total - 3) return 'zone-rel'
  return ''
}

function Row({
  s,
  total,
  zones = true,
}: {
  s: Standing
  total: number
  zones?: boolean
}) {
  return (
    <tr>
      <td className={`l pos-n ${zones ? zoneClass(s.position, total) : ''}`}>
        {s.position}
      </td>
      <td className="l">
        <div className="team">
          <Crest team={s.team} />
          {s.team.name}
        </div>
      </td>
      <td>{s.played}</td>
      <td className="hide-sm">{s.won}</td>
      <td className="hide-sm">{s.drawn}</td>
      <td className="hide-sm">{s.lost}</td>
      <td className="hide-sm">
        {s.goalDifference > 0 ? '+' : ''}
        {s.goalDifference}
      </td>
      <td className="l hide-sm">
        <span className="form-pips">
          {(s.form ?? []).slice(-5).map((r, i) => {
            const f = FORM_TR[r] ?? FORM_TR.D
            return (
              <span key={i} className={`pip ${f.cls}`}>
                {f.ch}
              </span>
            )
          })}
        </span>
      </td>
      <td>
        <span className="pts">{s.points}</span>
      </td>
    </tr>
  )
}

export default function StandingsPage() {
  const [code, setCode] = useState(leagueList[0].code)
  const [userPicked, setUserPicked] = useState(false)

  // Default to the competition actually running now (e.g. World Cup) until
  // the user picks one. Won't override a manual selection.
  const { data: defaultCode } = useQuery<string | null>({
    queryKey: ['standings-default'],
    queryFn: async () => {
      const res = await fetch('/api/standings/default')
      const json = await res.json().catch(() => null)
      return json?.data?.code ?? null
    },
    staleTime: 1000 * 60 * 30,
  })
  useEffect(() => {
    if (!userPicked && defaultCode && leagueList.some((l) => l.code === defaultCode)) {
      setCode(defaultCode)
    }
  }, [defaultCode, userPicked])

  const selected = leagueList.find((l) => l.code === code) ?? leagueList[0]
  const { data: standings = [], isLoading, isError, error } = useStandings(code)

  // Tournament standings (World Cup) come grouped; leagues as a single table
  const hasGroups = standings.some((s) => s.group)
  const sections: [string, Standing[]][] = hasGroups
    ? Array.from(
        standings.reduce((m, s) => {
          const key = s.group ?? ''
          const list = m.get(key) ?? []
          list.push(s)
          return m.set(key, list)
        }, new Map<string, Standing[]>())
      )
    : [['', standings]]

  const apiKeyMissing =
    isError &&
    (error instanceof ApiConfigError ||
      (error as Error)?.message?.includes('API'))

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Puan Durumu</h1>
          <div className="sub" style={{ marginTop: 4 }}>
            {selected.name} · {selected.country}
          </div>
        </div>
      </div>

      <div className="chip-row" style={{ marginBottom: 18 }}>
        {leagueList.map((l) => (
          <button
            key={l.code}
            className={`chipv${l.code === code ? ' on' : ''}`}
            onClick={() => {
              setUserPicked(true)
              setCode(l.code)
            }}
          >
            {l.name}
          </button>
        ))}
      </div>

      {apiKeyMissing ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Puan durumu için veri sağlayıcı anahtarı gerekli.
          </p>
        </div>
      ) : isLoading ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Yükleniyor…
          </p>
        </div>
      ) : standings.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Bu lig için puan durumu bulunamadı.
          </p>
        </div>
      ) : (
        <>
          {sections.map(([group, rows]) => (
            <div key={group || 'all'}>
              {group ? <h3 style={{ margin: '14px 0 8px' }}>{group}</h3> : null}
              <div className="card" style={{ padding: '8px 14px' }}>
                <div className="tablewrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th className="l">#</th>
                        <th className="l">Takım</th>
                        <th>O</th>
                        <th className="hide-sm">G</th>
                        <th className="hide-sm">B</th>
                        <th className="hide-sm">M</th>
                        <th className="hide-sm">Av</th>
                        <th className="l hide-sm">Son 5</th>
                        <th>P</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((s) => (
                        <Row
                          key={s.team.id}
                          s={s}
                          total={rows.length}
                          zones={!hasGroups}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}

          {!hasGroups && (
            <div className="legend">
              <span>
                <i style={{ background: 'var(--c1)' }} /> Şampiyonlar Ligi
              </span>
              <span>
                <i style={{ background: 'var(--c2)' }} /> Avrupa Ligi
              </span>
              <span>
                <i style={{ background: 'var(--neg)' }} /> Küme düşme
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
