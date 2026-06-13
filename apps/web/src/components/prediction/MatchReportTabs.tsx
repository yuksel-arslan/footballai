'use client'

import { useState } from 'react'
import { PreMatchReport } from '@/components/prediction/PreMatchReport'
import { InPlayAnalysis } from '@/components/prediction/InPlayAnalysis'
import { PostMatchReport } from '@/components/prediction/PostMatchReport'

type Phase = 'pre' | 'in' | 'post'

/**
 * Match-page report tabs: Maç öncesi (paid — 6 credits to view), Maç arası
 * (free in-play read), Maç sonrası (free post-match review). Defaults to the
 * phase that matches the current match status.
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

  const tabs: { key: Phase; label: string }[] = [
    { key: 'pre', label: 'Maç öncesi · 6 kredi' },
    { key: 'in', label: 'Maç arası' },
    { key: 'post', label: 'Maç sonrası' },
  ]

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}
      >
        {tabs.map((t) => (
          <span
            key={t.key}
            role="button"
            tabIndex={0}
            onClick={() => setPhase(t.key)}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid var(--line2)',
              background: phase === t.key ? 'var(--c1)' : 'transparent',
              color: phase === t.key ? '#fff' : 'var(--txt)',
            }}
          >
            {t.label}
          </span>
        ))}
      </div>

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
  )
}
