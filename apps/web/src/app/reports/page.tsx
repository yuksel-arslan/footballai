'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import type { MatchReportData } from '@/hooks/use-match-report'
import { formatDayLabel, formatTime } from '@/lib/format'

interface ReportListItem {
  id: number
  summary: string
  data: MatchReportData
  createdAt: string
  fixture: {
    apiId: number
    matchDate: string
    homeScore: number | null
    awayScore: number | null
    homeTeam: { name: string }
    awayTeam: { name: string }
    league: { name: string } | null
  }
}

function useRecentReports() {
  return useQuery<ReportListItem[]>({
    queryKey: ['reports', 'recent'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch('/api/reports?limit=30')
      if (!res.ok) throw new Error('reports_failed')
      const json = (await res.json()) as { data?: ReportListItem[] }
      return json.data ?? []
    },
  })
}

/**
 * "Maç Sonu" — the standalone post-match review page. Every finished match's
 * auto-generated analysis in one place: final score, whether the model's
 * pre-match call landed, and the narrative. Free; clicking through opens the
 * match page with the full review + takeaways.
 */
export default function ReportsPage() {
  const { data: reports = [], isLoading } = useRecentReports()

  // Honest scoreboard for the header: of the reported matches that had a
  // pre-match prediction, how many did the model get right?
  const judged = reports.filter((r) => r.data?.prediction?.existed)
  const hits = judged.filter((r) => r.data?.prediction?.correct).length

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Değerlendirme</div>
          <h1 style={{ marginTop: 6 }}>Maç Sonu</h1>
          <div className="sub" style={{ marginTop: 4 }}>
            Biten her maçın otomatik analizi — model isabeti, skor ve çıkarımlar.
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
            Değerlendirmeler yükleniyor…
          </p>
        </div>
      ) : reports.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Henüz değerlendirme yok. Bir maç bittiğinde analizi otomatik
            üretilir ve burada listelenir.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reports.map((r) => {
            const d = r.data
            const pred = d?.prediction
            return (
              <Link
                key={r.id}
                href={`/matches/${r.fixture.apiId}`}
                className="card"
                style={{ display: 'block' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <span className="tag">
                    {r.fixture.league?.name ?? 'Maç'} ·{' '}
                    {formatDayLabel(r.fixture.matchDate)}{' '}
                    {formatTime(r.fixture.matchDate)}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      display: 'inline-flex',
                      gap: 6,
                      flexWrap: 'wrap',
                    }}
                  >
                    {d?.surprise && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 999,
                          color: '#fff',
                          background:
                            d.surprise === 'major'
                              ? 'var(--neg, #ef4444)'
                              : 'var(--warn, #f59e0b)',
                        }}
                      >
                        {d.surprise === 'major' ? 'SÜRPRİZ' : 'Beklenmedik'}
                      </span>
                    )}
                    {d?.valueBet && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 999,
                          color: d.valueBet.won ? 'var(--pos)' : 'var(--neg)',
                          background: d.valueBet.won
                            ? 'color-mix(in srgb, var(--pos) 12%, transparent)'
                            : 'color-mix(in srgb, var(--neg) 10%, transparent)',
                        }}
                      >
                        💎{' '}
                        {d.valueBet.won
                          ? `+${d.valueBet.profitUnits.toFixed(2)}`
                          : '−1.00'}
                      </span>
                    )}
                    {pred?.existed && (
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 999,
                          color: pred.correct ? 'var(--pos)' : 'var(--neg)',
                          background: pred.correct
                            ? 'color-mix(in srgb, var(--pos) 12%, transparent)'
                            : 'color-mix(in srgb, var(--neg) 10%, transparent)',
                        }}
                      >
                        {pred.correct ? '✓ Tahmin tuttu' : '✗ Tahmin tutmadı'}
                      </span>
                    )}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    fontSize: 17,
                    fontWeight: 800,
                  }}
                >
                  {r.fixture.homeTeam.name} {r.fixture.homeScore ?? d.homeScore}{' '}
                  - {r.fixture.awayScore ?? d.awayScore}{' '}
                  {r.fixture.awayTeam.name}
                </div>

                {pred?.existed && (
                  <div
                    className="muted"
                    style={{ marginTop: 4, fontSize: 12.5 }}
                  >
                    Model tahmini: {pred.pickLabel}
                    {pred.predictedScore ? ` (${pred.predictedScore})` : ''}
                    {pred.probOnActual != null
                      ? ` · gerçekleşen sonuca verdiği olasılık %${pred.probOnActual}`
                      : ''}
                  </div>
                )}

                <p
                  className="muted"
                  style={{
                    margin: '10px 0 0',
                    fontSize: 13.5,
                    lineHeight: 1.6,
                  }}
                >
                  {r.summary}
                </p>

                <div
                  style={{
                    marginTop: 10,
                    color: 'var(--c2)',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  Tam değerlendirme ve çıkarımlar →
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
