'use client'

import { useInPlay } from '@/hooks/use-inplay'
import { ReportDisclaimer } from '@/components/prediction/ReportDisclaimer'

/**
 * In-play ("maç arası") analysis card: live score + an AI read of how the rest
 * of the match is likely to go. Free; generated automatically while a match is
 * underway. Shows a graceful placeholder before kickoff / after full time.
 */
export function InPlayAnalysis({
  fixtureId,
  homeTeam,
  awayTeam,
}: {
  fixtureId: number
  homeTeam: string
  awayTeam: string
}) {
  const { data, isLoading } = useInPlay(fixtureId, true)

  return (
    <div className="card">
      <span className="vbadge">Maç arası analizi</span>

      {isLoading ? (
        <p className="muted" style={{ margin: '12px 0 0', fontSize: 13 }}>
          Yükleniyor…
        </p>
      ) : !data?.live ? (
        <p className="muted" style={{ margin: '12px 0 0', fontSize: 13 }}>
          Maç arası analizi, maç başladığında canlı olarak burada görünür ve
          skor değiştikçe güncellenir.
        </p>
      ) : (
        <>
          <div style={{ marginTop: 12, fontSize: 20, fontWeight: 800 }}>
            {homeTeam} {data.homeScore ?? 0} - {data.awayScore ?? 0} {awayTeam}
          </div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
            {data.status === 'HALFTIME'
              ? 'Devre arası'
              : `${data.minute ?? ''}. dakika`}
          </div>
          {data.summary ? (
            <p
              style={{
                margin: '12px 0 0',
                fontSize: 13.5,
                lineHeight: 1.6,
              }}
            >
              {data.summary}
            </p>
          ) : (
            <p className="muted" style={{ margin: '12px 0 0', fontSize: 13 }}>
              Maç arası okuması hazırlanıyor — birazdan burada olacak.
            </p>
          )}

          {/* Updated (live-conditioned) prediction — analysis AND prediction
              repeated at this phase, per the flow. */}
          {data.homeWinProb != null &&
            data.drawProb != null &&
            data.awayWinProb != null && (
              <div style={{ marginTop: 14 }}>
                <div className="muted" style={{ fontSize: 11 }}>
                  Güncel tahmin (kalan süreye göre)
                </div>
                <div
                  style={{
                    display: 'flex',
                    height: 22,
                    borderRadius: 8,
                    overflow: 'hidden',
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: '#fff',
                    marginTop: 6,
                  }}
                  title="Maç içi güncellenmiş 1X2 dağılımı"
                >
                  {(
                    [
                      [data.homeWinProb, 'var(--c1, #10b981)'],
                      [data.drawProb, 'var(--faint, #888)'],
                      [data.awayWinProb, 'var(--c2, #22d3ee)'],
                    ] as const
                  ).map(([p, bg], i) => (
                    <span
                      key={i}
                      style={{
                        width: `${Math.max(p, 6)}%`,
                        background: bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      %{p}
                    </span>
                  ))}
                </div>
                {data.projectedScore && (
                  <div
                    className="muted"
                    style={{ fontSize: 12.5, marginTop: 6 }}
                  >
                    Tahmini final skor: <b>{data.projectedScore}</b>
                  </div>
                )}
              </div>
            )}
        </>
      )}

      <ReportDisclaimer />
    </div>
  )
}
