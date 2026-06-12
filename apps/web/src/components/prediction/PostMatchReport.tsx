'use client'

import { useMatchReport, type FormEntry } from '@/hooks/use-match-report'

/**
 * Industry-standard post-match review, grounded in the analysis literature:
 * expectation vs outcome with a surprise read (log-loss intuition), value-bet
 * settlement (Kelly accounting), pre-match form & last-10 deep stats mined
 * from history, H2H, goals/cards timeline with players, and a data-grounded
 * AI narrative + takeaways that feed future predictions. Renders gracefully
 * for v1 reports (missing sections are simply omitted).
 */

const sectionTitle: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--c1)',
  margin: '18px 0 8px',
}

function FormPips({ form }: { form: FormEntry[] }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {form.map((e, i) => (
        <span
          key={i}
          title={`${e.score} vs ${e.opponent} (${e.date})`}
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10.5,
            fontWeight: 800,
            color: '#fff',
            background:
              e.result === 'W'
                ? 'var(--pos, #10b981)'
                : e.result === 'L'
                  ? 'var(--neg, #ef4444)'
                  : 'var(--faint, #888)',
          }}
        >
          {e.result === 'W' ? 'G' : e.result === 'L' ? 'M' : 'B'}
        </span>
      ))}
    </span>
  )
}

function StatRow({
  label,
  home,
  away,
}: {
  label: string
  home: string | number
  away: string | number
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: 10,
        fontSize: 13,
        padding: '6px 0',
        borderBottom: '1px solid var(--line2)',
      }}
    >
      <span style={{ textAlign: 'right', fontWeight: 600 }}>{home}</span>
      <span className="muted" style={{ fontSize: 11.5, alignSelf: 'center' }}>
        {label}
      </span>
      <span style={{ fontWeight: 600 }}>{away}</span>
    </div>
  )
}

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
  const stats = d.stats
  const goals = (d.timeline ?? []).filter(
    (e) => e.type === 'goal' || e.type === 'own_goal' || e.type === 'penalty'
  )
  const cards = (d.timeline ?? []).filter(
    (e) => e.type === 'yellow' || e.type === 'red'
  )

  return (
    <div className="card">
      {/* ── Header band: result + surprise ── */}
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
        {d.surprise && (
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
            {d.surprise === 'major' ? 'BÜYÜK SÜRPRİZ' : 'Beklenmedik sonuç'}
          </span>
        )}
      </div>

      <div style={{ marginTop: 14, fontSize: 20, fontWeight: 800 }}>
        {homeTeam} {d.homeScore} - {d.awayScore} {awayTeam}
      </div>
      <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
        {winner ? `${winner} kazandı` : 'Beraberlik'}
      </div>

      {/* ── Expectation vs outcome ── */}
      {pred.existed && (
        <>
          <div style={sectionTitle}>Beklenti vs Gerçekleşme</div>
          {pred.probs && (
            <div
              style={{
                display: 'flex',
                height: 22,
                borderRadius: 8,
                overflow: 'hidden',
                fontSize: 10.5,
                fontWeight: 700,
                color: '#fff',
              }}
              title="Modelin maç öncesi 1X2 dağılımı; çerçeveli dilim gerçekleşen sonuç"
            >
              {(
                [
                  ['home', pred.probs.home, homeTeam, 'var(--c1, #10b981)'],
                  ['draw', pred.probs.draw, 'X', 'var(--faint, #888)'],
                  ['away', pred.probs.away, awayTeam, 'var(--c2, #22d3ee)'],
                ] as const
              ).map(([key, p, , bg]) => (
                <span
                  key={key}
                  style={{
                    width: `${Math.max(p, 6)}%`,
                    background: bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    outline:
                      key === d.outcome ? '2px solid var(--txt)' : undefined,
                    outlineOffset: -2,
                    opacity: key === d.outcome ? 1 : 0.55,
                  }}
                >
                  %{p}
                </span>
              ))}
            </div>
          )}
          <p
            className="muted"
            style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.55 }}
          >
            <b style={{ color: pred.correct ? 'var(--pos)' : 'var(--neg)' }}>
              {pred.correct ? '✓ Model tahmini tuttu.' : '✗ Model tahmini tutmadı.'}
            </b>{' '}
            Maç öncesi model {pred.pickLabel} demişti
            {pred.predictedScore ? ` (tahmini skor ${pred.predictedScore})` : ''}
            {pred.probOnActual != null
              ? `; gerçekleşen sonuca verdiği olasılık %${pred.probOnActual}`
              : ''}
            .
          </p>
        </>
      )}

      {/* ── Value-bet settlement ── */}
      {d.valueBet && (
        <>
          <div style={sectionTitle}>Değer Bahsi Sonucu</div>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              fontSize: 13,
              border: `1px solid ${
                d.valueBet.won
                  ? 'color-mix(in srgb, var(--pos) 45%, transparent)'
                  : 'color-mix(in srgb, var(--neg) 45%, transparent)'
              }`,
              background: d.valueBet.won
                ? 'color-mix(in srgb, var(--pos) 9%, transparent)'
                : 'color-mix(in srgb, var(--neg) 8%, transparent)',
            }}
          >
            Motorun seçimi: <b>{d.valueBet.pickLabel}</b> @
            {d.valueBet.odds.toFixed(2)} →{' '}
            <b style={{ color: d.valueBet.won ? 'var(--pos)' : 'var(--neg)' }}>
              {d.valueBet.won
                ? `KAZANDI (+${d.valueBet.profitUnits.toFixed(2)} birim)`
                : 'KAYBETTİ (−1.00 birim)'}
            </b>
            <span className="muted" style={{ fontSize: 11.5 }}>
              {' '}
              · 1 birim sabit bahis muhasebesi
            </span>
          </div>
        </>
      )}

      {/* ── Pre-match form + deep stats ── */}
      {(d.preForm || stats) && (
        <>
          <div style={sectionTitle}>Maç Öncesi Form ve İstatistik</div>
          {d.preForm && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: 10,
                alignItems: 'center',
                fontSize: 12.5,
                marginBottom: 6,
              }}
            >
              <span style={{ textAlign: 'right' }}>
                <FormPips form={d.preForm.home} />
              </span>
              <span className="muted" style={{ fontSize: 11.5 }}>
                Son 5 (eski→yeni ters)
              </span>
              <span>
                <FormPips form={d.preForm.away} />
              </span>
            </div>
          )}
          {stats && (
            <div>
              <StatRow
                label="Son 10: G-B-M"
                home={`${stats.home.wins}-${stats.home.draws}-${stats.home.losses}`}
                away={`${stats.away.wins}-${stats.away.draws}-${stats.away.losses}`}
              />
              <StatRow
                label="Gol ort. (attığı / yediği)"
                home={`${stats.home.gfAvg.toFixed(1)} / ${stats.home.gaAvg.toFixed(1)}`}
                away={`${stats.away.gfAvg.toFixed(1)} / ${stats.away.gaAvg.toFixed(1)}`}
              />
              <StatRow
                label="Üst 2.5 oranı"
                home={`%${stats.home.over25Rate}`}
                away={`%${stats.away.over25Rate}`}
              />
              <StatRow
                label="KG Var oranı"
                home={`%${stats.home.bttsRate}`}
                away={`%${stats.away.bttsRate}`}
              />
              <StatRow
                label="Gol yemediği maç / Seri"
                home={`${stats.home.cleanSheets} / ${stats.home.streak || '—'}`}
                away={`${stats.away.cleanSheets} / ${stats.away.streak || '—'}`}
              />
            </div>
          )}
        </>
      )}

      {/* ── H2H ── */}
      {d.h2h && d.h2h.total > 0 && (
        <>
          <div style={sectionTitle}>Aralarındaki Maçlar</div>
          <div style={{ fontSize: 13 }}>
            {homeTeam} <b>{d.h2h.homeWins}</b> · Beraberlik{' '}
            <b>{d.h2h.draws}</b> · {awayTeam} <b>{d.h2h.awayWins}</b>
            <span className="muted" style={{ fontSize: 11.5 }}>
              {' '}
              ({d.h2h.total} maç, bu maç dahil)
            </span>
          </div>
        </>
      )}

      {/* ── Timeline: goals & cards with players ── */}
      {(goals.length > 0 || cards.length > 0) && (
        <>
          <div style={sectionTitle}>Maçın Akışı</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[...goals, ...cards]
              .sort((a, b) => a.minute - b.minute)
              .map((e, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 8,
                    fontSize: 12.5,
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    className="muted"
                    style={{ width: 30, textAlign: 'right', flexShrink: 0 }}
                  >
                    {e.minute}&apos;
                  </span>
                  <span style={{ flexShrink: 0 }}>
                    {e.type === 'red'
                      ? '🟥'
                      : e.type === 'yellow'
                        ? '🟨'
                        : e.type === 'penalty'
                          ? '⚽ (P)'
                          : e.type === 'own_goal'
                            ? '⚽ (KK)'
                            : '⚽'}
                  </span>
                  <span>
                    <b>{e.player}</b>
                    <span className="muted">
                      {' '}
                      ({e.team === 'home' ? homeTeam : awayTeam})
                      {e.detail && e.type !== 'yellow' && e.type !== 'red'
                        ? ` · asist: ${e.detail}`
                        : ''}
                    </span>
                  </span>
                </div>
              ))}
          </div>
          {d.discipline &&
            (d.discipline.homeRed > 0 || d.discipline.awayRed > 0) && (
              <p
                className="muted"
                style={{ margin: '8px 0 0', fontSize: 12 }}
              >
                Kırmızı kart maçın dengesini değiştiren faktördür: 10 kişi
                kalan takımın gol yeme oranı literatürde belirgin biçimde artar.
              </p>
            )}
        </>
      )}

      {/* ── AI narrative ── */}
      <div style={sectionTitle}>Analiz</div>
      <p
        className="muted"
        style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}
      >
        {report.summary}
      </p>

      {/* ── Takeaways ── */}
      {d.takeaways.length > 0 && (
        <>
          <div style={sectionTitle}>Gelecek Maçlara Çıkarımlar</div>
          <ul
            className="muted"
            style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}
          >
            {d.takeaways.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </>
      )}

      <p
        className="muted"
        style={{ margin: '14px 0 0', fontSize: 11, opacity: 0.7 }}
      >
        Bu değerlendirme maç bittiğinde otomatik üretilir; form/istatistikler
        kendi maç arşivimizden, anlatı yapay zekâdan (veriye atıf zorunlu).
        Çıkarımlar takımların sonraki tahminlerine girdi olur.
      </p>
    </div>
  )
}
