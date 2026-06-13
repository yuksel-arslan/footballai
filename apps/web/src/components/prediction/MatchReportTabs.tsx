'use client'

import { useState } from 'react'
import { PreMatchReport } from '@/components/prediction/PreMatchReport'
import { InPlayAnalysis } from '@/components/prediction/InPlayAnalysis'
import { PostMatchReport } from '@/components/prediction/PostMatchReport'
import { useMatchReport } from '@/hooks/use-match-report'
import { FREE_MODE } from '@/lib/free-mode'

type Phase = 'pre' | 'in' | 'post'

/**
 * Visual analysis & prediction flow: a 3-step stepper — Maç öncesi (paid, 6
 * credits) → Maç arası (free in-play) → Maç sonu (free post-match) — with a
 * progress line, status dots (locked / live-pulse / ✓·✗) and an animated body
 * that swaps to the selected phase. Theme-driven, so it reads in light + dark.
 * Defaults to the phase matching the current match status.
 */
export function MatchReportTabs({
  fixtureId,
  homeTeam,
  awayTeam,
  status,
}: {
  fixtureId: number
  homeTeam: string
  awayTeam: string
  status: string
}) {
  const finished = status === 'FINISHED'
  const live = status === 'LIVE' || status === 'HALFTIME'
  const [phase, setPhase] = useState<Phase>(
    finished ? 'post' : live ? 'in' : 'pre'
  )

  // Post-match verdict for the final dot/badge (free; regenerates stale
  // reports on access so the ✓/✗ reflects the corrected rule). Only when done.
  const { data: report } = useMatchReport(fixtureId, finished)
  const correct = finished ? (report?.data?.prediction?.correct ?? null) : null

  const steps: {
    key: Phase
    n: string
    title: string
    cls: string
    badge: { text: string; cls: string }
  }[] = [
    {
      key: 'pre',
      n: '①',
      title: 'Maç öncesi',
      cls: 'reached',
      badge: FREE_MODE
        ? { text: 'Ücretsiz', cls: 'ok' }
        : { text: '6 kredi', cls: 'pre' },
    },
    {
      key: 'in',
      n: '②',
      title: 'Maç arası',
      cls: live ? 'reached live' : finished ? 'reached' : '',
      badge: live
        ? { text: 'Canlı', cls: 'live' }
        : { text: 'Maç arası', cls: 'muted' },
    },
    {
      key: 'post',
      n: '③',
      title: 'Maç sonu',
      cls: finished
        ? `reached ${correct === true ? 'done-ok' : correct === false ? 'done-miss' : ''}`
        : '',
      badge: finished
        ? correct === true
          ? { text: '✓ Tuttu', cls: 'ok' }
          : correct === false
            ? { text: '✗ Tutmadı', cls: 'miss' }
            : { text: 'Bitti', cls: 'muted' }
        : { text: 'Maç sonu', cls: 'muted' },
    },
  ]

  return (
    <div className="aflow">
      <div className="aflow-steps" role="tablist" aria-label="Analiz akışı">
        {steps.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={phase === s.key}
            onClick={() => setPhase(s.key)}
            className={`aflow-step ${s.cls}${phase === s.key ? ' active' : ''}`}
          >
            <span className="aflow-dot" />
            <span className="aflow-title">
              {s.n} {s.title}
            </span>
            <span className={`aflow-badge ${s.badge.cls}`}>{s.badge.text}</span>
          </button>
        ))}
      </div>

      <div className="aflow-body" key={phase}>
        {phase === 'pre' ? (
          <PreMatchReport
            fixtureId={fixtureId}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            autoReveal
          />
        ) : phase === 'in' ? (
          <InPlayAnalysis
            fixtureId={fixtureId}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
        ) : finished ? (
          <PostMatchReport
            fixtureId={fixtureId}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
        ) : (
          <div className="card">
            <span className="vbadge">Maç sonu değerlendirmesi</span>
            <p className="muted" style={{ margin: '12px 0 0', fontSize: 13 }}>
              Maç sonu raporu, maç bittiğinde otomatik hazırlanır ve burada
              ücretsiz görünür.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
