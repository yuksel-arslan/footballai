'use client'

import Link from 'next/link'
import type { Fixture } from '@/lib/api'
import { Crest } from './crest'
import { formatTime, formatDayLabel, predictionPick, pct } from '@/lib/format'

const PIP_CH: Record<string, string> = { W: 'G', D: 'B', L: 'M' }
const PIP_CLS: Record<string, string> = {
  W: 'pip-w',
  D: 'pip-d',
  L: 'pip-l',
}

function MiniForm({ form }: { form?: ('W' | 'D' | 'L')[] }) {
  if (!form?.length) return null
  return (
    <span className="form-pips" style={{ marginLeft: 'auto' }}>
      {form.map((r, i) => (
        <span key={i} className={`pip ${PIP_CLS[r]}`}>
          {PIP_CH[r]}
        </span>
      ))}
    </span>
  )
}

export interface RowValueBet {
  pickLabel: string
  odds: number
  evPerUnit: number
}

export interface RowMarketOdds {
  home: number
  draw: number
  away: number
}

/** A single fixture row in the shared "mrow" style, linking to its analysis. */
export function MatchRow({
  fixture,
  homeForm,
  awayForm,
  value,
  marketOdds,
}: {
  fixture: Fixture
  homeForm?: ('W' | 'D' | 'L')[]
  awayForm?: ('W' | 'D' | 'L')[]
  value?: RowValueBet
  marketOdds?: RowMarketOdds
}) {
  const live = fixture.status === 'LIVE' || fixture.status === 'HALFTIME'
  const finished = fixture.status === 'FINISHED'
  const showScore = live || finished
  const pick = predictionPick(fixture)

  const homeScore = showScore ? (fixture.homeScore ?? 0) : '–'
  const awayScore = showScore ? (fixture.awayScore ?? 0) : '–'
  const scoreStyle = showScore ? { color: 'var(--txt)' } : undefined

  return (
    <Link className="mrow" href={`/matches/${fixture.id}`}>
      <div className="time">
        {live ? (
          <>
            <span className="livetag">
              <span className="dot live" /> {fixture.minute ?? ''}&apos;
            </span>
            <span className="d">CANLI</span>
          </>
        ) : (
          <>
            <span className="t">
              {finished ? 'Bitti' : formatTime(fixture.matchDate)}
            </span>
            <span className="d">{formatDayLabel(fixture.matchDate)}</span>
          </>
        )}
      </div>

      <div className="fixture">
        <div className="teamrow">
          <Crest team={fixture.homeTeam} />
          <span className="nm">{fixture.homeTeam.name}</span>
          {showScore ? null : <MiniForm form={homeForm} />}
          <span className="sc" style={scoreStyle}>
            {homeScore}
          </span>
        </div>
        <div className="teamrow">
          <Crest team={fixture.awayTeam} />
          <span className="nm">{fixture.awayTeam.name}</span>
          {showScore ? null : <MiniForm form={awayForm} />}
          <span className="sc" style={scoreStyle}>
            {awayScore}
          </span>
        </div>
      </div>

      <div className="pickcol">
        {value ? (
          <>
            <span className="lbl">💎 Değer · {value.pickLabel}</span>
            <span className="pk">@{value.odds.toFixed(2)}</span>
            <span className="edge-pill sm">
              +%{Math.round(value.evPerUnit * 100)} EV
            </span>
          </>
        ) : marketOdds ? (
          <>
            <span className="lbl">Piyasa oranı</span>
            <span className="odds-1x2">
              <span>
                <i>1</i> {marketOdds.home.toFixed(2)}
              </span>
              <span>
                <i>X</i> {marketOdds.draw.toFixed(2)}
              </span>
              <span>
                <i>2</i> {marketOdds.away.toFixed(2)}
              </span>
            </span>
          </>
        ) : pick ? (
          <>
            <span className="lbl">Model tahmini</span>
            <span className="pk">{pick.label}</span>
            <span className="edge-pill sm">%{pct(pick.confidence)} güven</span>
          </>
        ) : (
          <>
            <span className="lbl">Model</span>
            <span className="pk muted">—</span>
          </>
        )}
      </div>
    </Link>
  )
}
