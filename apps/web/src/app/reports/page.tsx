'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { formatDayLabel, formatTime } from '@/lib/format'

interface ReportCard {
  fixtureId: number
  home: string
  away: string
  league: string
  matchDate: string
  status: string
  finished: boolean
  live: boolean
  homeScore: number | null
  awayScore: number | null
  hasPrediction: boolean
  hasPostReport: boolean
  postSummary?: string | null
  predictionExisted: boolean
  predictionCorrect: boolean | null
  predictionPickLabel?: string | null
  predictedScore?: string | null
  preview?: {
    homeForm: ('W' | 'D' | 'L')[]
    awayForm: ('W' | 'D' | 'L')[]
    h2h: { homeWins: number; draws: number; awayWins: number; total: number }
  } | null
}

type Phase = 'pre' | 'post'

/** Compact form pips (G/B/M) for the card teaser. */
function FormPips({ form }: { form: ('W' | 'D' | 'L')[] }) {
  if (!form || form.length === 0) return <span className="muted">—</span>
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {form.map((r, i) => (
        <span
          key={i}
          style={{
            width: 17,
            height: 17,
            borderRadius: 5,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9.5,
            fontWeight: 800,
            color: '#fff',
            background:
              r === 'W'
                ? 'var(--pos, #10b981)'
                : r === 'L'
                  ? 'var(--neg, #ef4444)'
                  : 'var(--faint, #888)',
          }}
        >
          {r === 'W' ? 'G' : r === 'L' ? 'M' : 'B'}
        </span>
      ))}
    </span>
  )
}

/** Always-visible teaser: last-5 form for both sides + H2H tally. */
function CardPreview({ card }: { card: ReportCard }) {
  const p = card.preview
  if (!p) return null
  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTop: '1px solid var(--line2)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px 18px',
        alignItems: 'center',
        fontSize: 12,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span className="muted">{card.home} son 5</span>
        <FormPips form={p.homeForm} />
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span className="muted">{card.away} son 5</span>
        <FormPips form={p.awayForm} />
      </span>
      {p.h2h.total > 0 && (
        <span className="muted">
          Aralarında: <b style={{ color: 'var(--txt)' }}>{p.h2h.homeWins}</b>-
          {p.h2h.draws}-<b style={{ color: 'var(--txt)' }}>{p.h2h.awayWins}</b>{' '}
          ({p.h2h.total} maç)
        </span>
      )}
    </div>
  )
}

function useReportCards() {
  return useQuery<ReportCard[]>({
    queryKey: ['report-cards'],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch('/api/reports/cards?limit=40')
      if (!res.ok) throw new Error('reports_failed')
      const json = (await res.json()) as { data?: ReportCard[] }
      return json.data ?? []
    },
  })
}

function StatusBadge({ card }: { card: ReportCard }) {
  if (card.live)
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: 999,
          color: '#fff',
          background: 'var(--neg, #ef4444)',
        }}
      >
        CANLI
      </span>
    )
  if (card.finished)
    return (
      <span className="tag" style={{ fontSize: 11 }}>
        Bitti
      </span>
    )
  return (
    <span className="tag" style={{ fontSize: 11 }}>
      Yaklaşan
    </span>
  )
}

function Card({ card }: { card: ReportCard }) {
  // Default tab: finished matches open on "Sonra", others on "Önce".
  const [phase, setPhase] = useState<Phase>(card.finished ? 'post' : 'pre')

  const tabStyle = (key: Phase): React.CSSProperties => ({
    padding: '5px 12px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    border: '1px solid var(--line2)',
    background: phase === key ? 'var(--c1)' : 'transparent',
    color: phase === key ? '#fff' : 'var(--txt)',
  })

  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <span className="tag">
          {card.league} · {formatDayLabel(card.matchDate)}{' '}
          {formatTime(card.matchDate)}
        </span>
        <span style={{ marginLeft: 'auto' }}>
          <StatusBadge card={card} />
        </span>
      </div>

      <div style={{ marginTop: 10, fontSize: 17, fontWeight: 800 }}>
        {card.home}
        {card.homeScore != null && card.awayScore != null ? (
          <>
            {' '}
            {card.homeScore} - {card.awayScore}{' '}
          </>
        ) : (
          <span className="muted"> vs </span>
        )}
        {card.away}
      </div>

      {/* Teaser stats so the card never looks empty */}
      <CardPreview card={card} />

      {/* Önce / Sonra toggle */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <span
          role="button"
          tabIndex={0}
          onClick={() => setPhase('pre')}
          style={tabStyle('pre')}
        >
          Önce
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={() => setPhase('post')}
          style={tabStyle('post')}
        >
          Sonra
        </span>
      </div>

      {phase === 'pre' ? (
        <div style={{ marginTop: 12 }}>
          <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
            {card.hasPrediction
              ? 'Model tahmini, maç öncesi form/istatistik ve geçmiş karşılaşmalar hazır.'
              : 'Maç öncesi analiz hazırlanıyor (form, istatistik ve geçmiş karşılaşmalar mevcut).'}
            {card.live ? ' Maç arası okuması dahil.' : ''}
          </p>
          <Link
            href={`/reports/${card.fixtureId}`}
            className="card"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 10,
              padding: '8px 14px',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            }}
          >
            📄{' '}
            {card.finished
              ? 'Önce raporunu aç (3 kredi · yarı fiyat)'
              : 'Önce raporunu aç (6 kredi)'}{' '}
            →
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          {card.finished && card.hasPostReport ? (
            <>
              {card.predictionExisted && (
                <div
                  style={{ marginBottom: 8, fontSize: 12.5, fontWeight: 700 }}
                >
                  <span
                    style={{
                      color: card.predictionCorrect
                        ? 'var(--pos, #10b981)'
                        : 'var(--neg, #ef4444)',
                    }}
                  >
                    {card.predictionCorrect
                      ? '✓ Tahmin tuttu'
                      : '✗ Tahmin tutmadı'}
                  </span>
                  {card.predictedScore && (
                    <span className="muted" style={{ fontWeight: 500 }}>
                      {' '}
                      · tahmin: {card.predictionPickLabel} (
                      {card.predictedScore})
                    </span>
                  )}
                </div>
              )}
              <p
                className="muted"
                style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}
              >
                {card.postSummary}
              </p>
              <a
                href={`/reports/${card.fixtureId}/html`}
                style={{
                  display: 'inline-block',
                  marginTop: 10,
                  color: 'var(--c2)',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Raporu aç (HTML) →
              </a>
            </>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
              Maç sonu raporu, maç bitince otomatik hazırlanır ve ücretsiz
              görünür.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * "Raporlar" — every match as a card with an Önce/Sonra toggle. "Önce" opens
 * the paid (6 credit) pre-match report; "Sonra" shows the free post-match
 * review. Pre-match predictions, in-play reads and post-match reviews are all
 * generated automatically.
 */
export default function ReportsPage() {
  const { data: cards = [], isLoading } = useReportCards()

  // Honest scoreboard: of judged (finished + reported) matches, how many did
  // the model's call land? Correctness follows the predicted scoreline.
  const judged = cards.filter((c) => c.finished && c.predictionExisted)
  const hits = judged.filter((c) => c.predictionCorrect).length

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Değerlendirme</div>
          <h1 style={{ marginTop: 6 }}>Raporlar</h1>
          <div className="sub" style={{ marginTop: 4 }}>
            Her maç için maç öncesi (Önce) ve maç sonu (Sonra) analiz — otomatik
            üretilir. Önce raporu 6 kredi, Sonra raporu ücretsiz.
          </div>
        </div>
        {judged.length > 0 && (
          <div className="right">
            <span className="disc">
              Model son {judged.length} değerlendirilen maçta{' '}
              <b style={{ color: 'var(--txt)' }}>
                {hits}/{judged.length}
              </b>{' '}
              isabet
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Raporlar yükleniyor…
          </p>
        </div>
      ) : cards.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Şu an listelenecek maç yok. Yaklaşan ve biten maçlar burada kart
            olarak görünür.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cards.map((c) => (
            <Card key={c.fixtureId} card={c} />
          ))}
        </div>
      )}
    </div>
  )
}
