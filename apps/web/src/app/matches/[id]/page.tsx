'use client'

import { use } from 'react'
import Link from 'next/link'
import { useMatchDetail } from '@/hooks/use-match-detail'
import { Crest } from '@/components/app/crest'
import { ValueBetPanel } from '@/components/prediction/ValueBetPanel'
import { GenerateModelPrediction } from '@/components/prediction/GenerateModelPrediction'
import { formatTime, formatDayLabel, predictionPick, pct } from '@/lib/format'

interface MatchDetailPageProps {
  params: Promise<{ id: string }>
}

function ProbRow({ label, prob }: { label: string; prob: number }) {
  const w = pct(prob)
  return (
    <div className="erow">
      <span className="out">{label}</span>
      <div className="bars">
        <div>
          <div className="blabel">Model %{w}</div>
          <div className="minibar model">
            <span style={{ width: `${w}%` }} />
          </div>
        </div>
      </div>
      <span className="edgeval pos">%{w}</span>
    </div>
  )
}

export default function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { id } = use(params)
  const fixtureId = Number(id)
  const { data: fx, isLoading } = useMatchDetail(fixtureId)

  if (isLoading) {
    return (
      <div className="page">
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Yükleniyor…
          </p>
        </div>
      </div>
    )
  }
  if (!fx) {
    return (
      <div className="page">
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Maç bulunamadı.
          </p>
        </div>
      </div>
    )
  }

  const live = fx.status === 'LIVE' || fx.status === 'HALFTIME'
  const finished = fx.status === 'FINISHED'
  const showScore = live || finished
  const pred = fx.predictions?.[0]
  const pick = predictionPick(fx)

  return (
    <div className="page">
      <div className="crumb">
        <Link href="/matches">Maçlar</Link>
        <span className="sep">/</span>
        <span className="muted">{fx.league?.name}</span>
        <span className="sep">/</span>
        <span className="cur">
          {fx.homeTeam.name} - {fx.awayTeam.name}
        </span>
      </div>

      {/* HEADER */}
      <div className="mhead">
        <div className="matchup">
          <Crest team={fx.homeTeam} size="lg" />
          <div className="team-line">
            <span className="nm">{fx.homeTeam.name}</span>
          </div>
        </div>
        {showScore ? (
          <span
            className="vs"
            style={{
              fontSize: 26,
              color: 'var(--txt)',
              fontWeight: 800,
            }}
          >
            {fx.homeScore ?? 0} : {fx.awayScore ?? 0}
          </span>
        ) : (
          <span className="vs">-</span>
        )}
        <div className="matchup">
          <Crest team={fx.awayTeam} size="lg" />
          <div className="team-line">
            <span className="nm">{fx.awayTeam.name}</span>
          </div>
        </div>
        <div className="ko">
          <div className="tag" style={{ marginBottom: 6 }}>
            {fx.league?.name}
            {fx.round ? ` · ${fx.round}` : ''}
          </div>
          <div className="t">
            {live ? (
              <span className="livetag">
                <span className="dot live" /> {fx.minute ?? ''}&apos;
              </span>
            ) : finished ? (
              'Maç bitti'
            ) : (
              `${formatDayLabel(fx.matchDate)}, ${formatTime(fx.matchDate)}`
            )}
          </div>
          {fx.venue && <div className="d">{fx.venue}</div>}
        </div>
      </div>

      <div className="cols">
        <div className="main">
          {/* MODEL VERDICT */}
          {pick ? (
            <div className="card verdict">
              <div className="vrow">
                <span className="vbadge">Model tahmini</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  Poisson + XGBoost topluluğu
                </span>
              </div>
              <div className="pick">{pick.label}</div>
              <div className="vmeta">
                <div className="vstat">
                  <div className="l">Olasılık</div>
                  <div className="v pos">%{pct(pick.prob)}</div>
                </div>
                <div className="vstat">
                  <div className="l">Güven</div>
                  <div className="v">%{pct(pick.confidence)}</div>
                </div>
                {pred?.predictedHomeScore != null && (
                  <div className="vstat">
                    <div className="l">Tahmini skor</div>
                    <div className="v">
                      {pred.predictedHomeScore}-{pred.predictedAwayScore}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <GenerateModelPrediction fixture={fx} />
          )}

          {/* MODEL PROBABILITIES */}
          {pred && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-h">
                <h3>Model olasılıkları</h3>
                <span className="hint">1X2</span>
              </div>
              <div className="edge">
                <div className="erow head">
                  <span>Sonuç</span>
                  <span>Model</span>
                  <span style={{ textAlign: 'right' }}>Olasılık</span>
                </div>
                <ProbRow label={fx.homeTeam.name} prob={pred.homeWinProb} />
                <ProbRow label="Beraberlik" prob={pred.drawProb} />
                <ProbRow label={fx.awayTeam.name} prob={pred.awayWinProb} />
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR: real value engine */}
        <div>
          <ValueBetPanel
            fixtureId={fixtureId}
            homeTeam={fx.homeTeam.name}
            awayTeam={fx.awayTeam.name}
          />
        </div>
      </div>
    </div>
  )
}
