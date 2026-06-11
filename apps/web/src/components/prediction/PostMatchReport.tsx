'use client'

import { useMatchReport } from '@/hooks/use-match-report'

/**
 * Industry-standard post-match review for a FINISHED fixture: final result
 * read, model-accuracy verdict (did the pre-match prediction land), the AI
 * narrative, and the takeaways that feed future predictions. Free — the
 * report is generated automatically server-side when the match ends.
 */
export function PostMatchReport({
  fixtureId,
  homeTeam,
  awayTeam,
}: {
  fixtureId: number
  homeTeam: string
  awayTeam: string
}) {
  const { data: report, isLoading } = useMatchReport(fixtureId, true)

  if (isLoading) {
    return (
      <div className="card">
        <span className="vbadge">Maç sonu değerlendirmesi</span>
        <p className="muted" style={{ margin: '12px 0 0', fontSize: 13 }}>
          Değerlendirme yükleniyor…
        </p>
      </div>
    )
  }
  if (!report) {
    return (
      <div className="card">
        <span className="vbadge">Maç sonu değerlendirmesi</span>
        <p className="muted" style={{ margin: '12px 0 0', fontSize: 13 }}>
          Bu maçın değerlendirmesi hazırlanıyor — kısa süre sonra burada olacak.
        </p>
      </div>
    )
  }

  const d = report.data
  const winner =
    d.outcome === 'home' ? homeTeam : d.outcome === 'away' ? awayTeam : null
  const pred = d.prediction

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
        <span className="vbadge">Maç sonu değerlendirmesi</span>
        <span className="tag">{d.league}</span>
      </div>

      {/* Result line */}
      <div
        style={{
          marginTop: 14,
          fontSize: 20,
          fontWeight: 800,
        }}
      >
        {homeTeam} {d.homeScore} - {d.awayScore} {awayTeam}
      </div>
      <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
        {winner ? `${winner} kazandı` : 'Beraberlik'}
      </div>

      {/* Model accuracy verdict */}
      {pred.existed && (
        <div
          style={{
            marginTop: 14,
            padding: '10px 14px',
            borderRadius: 12,
            border: `1px solid ${
              pred.correct
                ? 'color-mix(in srgb, var(--c1) 45%, transparent)'
                : 'color-mix(in srgb, var(--neg) 45%, transparent)'
            }`,
            background: pred.correct
              ? 'color-mix(in srgb, var(--c1) 9%, transparent)'
              : 'color-mix(in srgb, var(--neg) 8%, transparent)',
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          <b>{pred.correct ? '✓ Model tahmini tuttu.' : '✗ Model tahmini tutmadı.'}</b>{' '}
          Maç öncesi model {pred.pickLabel} demişti
          {pred.predictedScore ? ` (tahmini skor ${pred.predictedScore})` : ''}
          {pred.probOnActual != null
            ? `; gerçekleşen sonuca verdiği olasılık %${pred.probOnActual} idi`
            : ''}
          {pred.confidence != null ? `, güven %${pred.confidence}` : ''}.
        </div>
      )}

      {/* AI narrative */}
      <p
        className="muted"
        style={{ margin: '14px 0 0', fontSize: 13.5, lineHeight: 1.6 }}
      >
        {report.summary}
      </p>

      {/* Takeaways — these feed the next predictions as input */}
      {d.takeaways.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--c1)',
            }}
          >
            Gelecek maçlara çıkarımlar
          </div>
          <ul
            className="muted"
            style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}
          >
            {d.takeaways.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="muted" style={{ margin: '14px 0 0', fontSize: 11, opacity: 0.7 }}>
        Bu değerlendirme maç bittiğinde otomatik üretilir ve takımların sonraki
        maç tahminlerine girdi olarak kullanılır.
      </p>
    </div>
  )
}
