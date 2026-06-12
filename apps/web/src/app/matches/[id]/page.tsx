'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useMatchDetail } from '@/hooks/use-match-detail'
import { Crest } from '@/components/app/crest'
import { ValueBetPanel } from '@/components/prediction/ValueBetPanel'
import { GenerateModelPrediction } from '@/components/prediction/GenerateModelPrediction'
import { CombinedVerdict } from '@/components/prediction/CombinedVerdict'
import { PostMatchReport } from '@/components/prediction/PostMatchReport'
import { TeamHistoryCards } from '@/components/prediction/TeamHistoryCards'
import { formatTime, formatDayLabel } from '@/lib/format'
import type { PredictionData } from '@/hooks/use-prediction'
import type { DixonColesResult } from '@/hooks/use-dixon-coles'

interface MatchDetailPageProps {
  params: Promise<{ id: string }>
}

export default function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { id } = use(params)
  const fixtureId = Number(id)
  const { data: fx, isLoading } = useMatchDetail(fixtureId)

  // Results from the two analysis cards, fused into one verdict below.
  const [aiResult, setAiResult] = useState<PredictionData | null>(null)
  const [dcResult, setDcResult] = useState<DixonColesResult | null>(null)

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

      {/* POST-MATCH REVIEW — auto-generated when the match ends (free) */}
      {finished && (
        <div style={{ marginBottom: 16 }}>
          <PostMatchReport
            fixtureId={fixtureId}
            homeTeam={fx.homeTeam.name}
            awayTeam={fx.awayTeam.name}
          />
        </div>
      )}

      {/* PRE-MATCH / LIVE TOOLS — a finished match is reviewed, not predicted:
          no prediction/value CTAs once the result is in (the report's
          expectation-vs-outcome section covers the stored prediction). */}
      {!finished && (
        <>
          <div className="cols">
            <div className="main">
              {/* MODEL PREDICTION — gated: each viewer pays once to reveal it */}
              <GenerateModelPrediction
                fixture={fx}
                hasStored={!!pred}
                onResult={setAiResult}
              />
            </div>

            {/* SIDEBAR: real value engine */}
            <div>
              <ValueBetPanel
                fixtureId={fixtureId}
                homeTeam={fx.homeTeam.name}
                awayTeam={fx.awayTeam.name}
                onResult={setDcResult}
                live={
                  live
                    ? {
                        minute:
                          fx.minute ?? (fx.status === 'HALFTIME' ? 45 : 60),
                        homeGoals: fx.homeScore ?? 0,
                        awayGoals: fx.awayScore ?? 0,
                      }
                    : null
                }
              />
            </div>
          </div>

          {/* COMBINED VERDICT — fuses AI prediction + statistical value model */}
          <CombinedVerdict
            ai={aiResult}
            dc={dcResult}
            homeTeam={fx.homeTeam.name}
            awayTeam={fx.awayTeam.name}
          />
        </>
      )}

      {/* HISTORY — both teams' recent-form stats + H2H from finished fixtures */}
      <TeamHistoryCards
        homeTeamId={fx.homeTeam.id}
        awayTeamId={fx.awayTeam.id}
        homeTeamName={fx.homeTeam.name}
        awayTeamName={fx.awayTeam.name}
      />
    </div>
  )
}
