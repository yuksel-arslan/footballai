'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, FileText } from 'lucide-react'
import {
  usePreReport,
  usePreReportStatus,
  type PreReport,
} from '@/hooks/use-pre-report'
import type { FormEntry } from '@/hooks/use-match-report'
import { ReportDisclaimer } from '@/components/prediction/ReportDisclaimer'
import { FREE_MODE } from '@/lib/free-mode'

const sectionTitle: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--c1)',
  margin: '18px 0 8px',
}

function FormPips({ form }: { form: FormEntry[] }) {
  if (form.length === 0) return <span className="muted">—</span>
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

/** Presentational: renders an already-unlocked pre-match ("Önce") report. */
export function PreReportBody({ report }: { report: PreReport }) {
  const { home, away, league, preMatch, inPlay } = report
  const p = preMatch.prediction
  const stats = preMatch.stats
  const h2h = preMatch.h2h

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
        <span className="vbadge">Maç öncesi analiz</span>
        <span className="tag">{league}</span>
      </div>

      <div style={{ marginTop: 12, fontSize: 18, fontWeight: 800 }}>
        {home} <span className="muted">vs</span> {away}
      </div>

      {/* In-play ("maç arası") read — shown while the match is underway */}
      {inPlay && (
        <>
          <div style={sectionTitle}>Maç Arası</div>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.55,
              border:
                '1px solid color-mix(in srgb, var(--c2) 35%, transparent)',
              background: 'color-mix(in srgb, var(--c2) 8%, transparent)',
            }}
          >
            <b>
              {inPlay.minute}&apos; · {inPlay.score}
            </b>{' '}
            — {inPlay.summary}
          </div>
        </>
      )}

      {/* AI prediction */}
      {p.exists ? (
        <>
          <div style={sectionTitle}>Model Tahmini</div>
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
            title="Modelin maç öncesi 1X2 dağılımı"
          >
            {(
              [
                [p.homeWinProb ?? 0, 'var(--c1, #10b981)'],
                [p.drawProb ?? 0, 'var(--faint, #888)'],
                [p.awayWinProb ?? 0, 'var(--c2, #22d3ee)'],
              ] as const
            ).map(([prob, bg], i) => (
              <span
                key={i}
                style={{
                  width: `${Math.max(prob, 6)}%`,
                  background: bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                %{prob}
              </span>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 22,
              marginTop: 10,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Öne çıkan
              </div>
              <div style={{ fontWeight: 700 }}>{p.pickLabel}</div>
            </div>
            {p.predictedScore && (
              <div>
                <div className="muted" style={{ fontSize: 11 }}>
                  Tahmini skor
                </div>
                <div style={{ fontWeight: 700 }}>{p.predictedScore}</div>
              </div>
            )}
            {p.confidence != null && (
              <div>
                <div className="muted" style={{ fontSize: 11 }}>
                  Güven
                </div>
                <div style={{ fontWeight: 700 }}>%{p.confidence}</div>
              </div>
            )}
          </div>
          {p.explanation && (
            <p
              className="muted"
              style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.55 }}
            >
              {p.explanation}
            </p>
          )}
          {p.keyFactors && p.keyFactors.length > 0 && (
            <ul
              className="muted"
              style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5 }}
            >
              {p.keyFactors.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="muted" style={{ margin: '12px 0 0', fontSize: 13 }}>
          Bu maç için model tahmini henüz hazırlanıyor; rapor form, istatistik
          ve geçmiş karşılaşma verileriyle sunuluyor.
        </p>
      )}

      {/* Pre-match form + deep stats */}
      <div style={sectionTitle}>Maç Öncesi Form ve İstatistik</div>
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
          <FormPips form={preMatch.form.home} />
        </span>
        <span className="muted" style={{ fontSize: 11.5 }}>
          Son 5 (yeni→eski)
        </span>
        <span>
          <FormPips form={preMatch.form.away} />
        </span>
      </div>
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

      {/* H2H */}
      {h2h.total > 0 && (
        <>
          <div style={sectionTitle}>Aralarındaki Maçlar</div>
          <div style={{ fontSize: 13 }}>
            {home} <b>{h2h.homeWins}</b> · Beraberlik <b>{h2h.draws}</b> ·{' '}
            {away} <b>{h2h.awayWins}</b>
            <span className="muted" style={{ fontSize: 11.5 }}>
              {' '}
              ({h2h.total} maç)
            </span>
          </div>
        </>
      )}

      <p
        className="muted"
        style={{ margin: '14px 0 0', fontSize: 11, opacity: 0.7 }}
      >
        Maç öncesi rapor; model tahmini yapay zekâdan, form/istatistik ve geçmiş
        karşılaşmalar kendi maç arşivimizden otomatik üretilir.
      </p>

      <ReportDisclaimer />
    </div>
  )
}

/**
 * Self-contained pre-match ("Önce") report card: shows a 6-credit unlock CTA,
 * auto-reveals for viewers who already paid, then renders the report. Used on
 * the reports detail page.
 */
export function PreMatchReport({
  fixtureId,
  homeTeam,
  awayTeam,
  autoReveal = false,
}: {
  fixtureId: number
  homeTeam: string
  awayTeam: string
  /** When true, reveal immediately for viewers who already paid. */
  autoReveal?: boolean
}) {
  const { data: status } = usePreReportStatus(fixtureId)
  const mutation = usePreReport()
  const [report, setReport] = useState<PreReport | null>(null)

  const unlock = (confirmIfCharged = false) => {
    // Accidental re-press guard: if it will charge (not yet paid) and the
    // analysis is already prepared, confirm before deducting credits. Skipped
    // entirely in free mode (nothing is charged).
    if (
      !FREE_MODE &&
      confirmIfCharged &&
      !status?.paid &&
      status?.hasPrediction &&
      !window.confirm(
        `Bu maç için analiz zaten hazır. Raporu görüntülemek için ${status?.cost ?? 6} kredi düşülecek. Devam edilsin mi?`
      )
    ) {
      return
    }
    mutation.mutate({ fixtureId }, { onSuccess: (r) => setReport(r.report) })
  }

  // Already paid → revealing costs nothing; load it without a second click.
  const auto = useRef(false)
  useEffect(() => {
    // Free mode is fully automatic: reveal the report with no button/click.
    // (Paid mode still auto-reveals only for viewers who already paid.)
    if (
      (FREE_MODE || (autoReveal && status?.paid)) &&
      status?.available !== false &&
      !report &&
      !mutation.isPending &&
      !auto.current
    ) {
      auto.current = true
      unlock()
    }
  }, [autoReveal, status, report, mutation.isPending, unlock])

  if (report) {
    return <PreReportBody report={report} />
  }

  const fail = mutation.error?.failure
  const paid = !!status?.paid
  const cost = status?.cost ?? 6

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
        <span className="vbadge">
          <FileText
            size={13}
            style={{ verticalAlign: '-2px', marginRight: 4 }}
          />
          Maç öncesi rapor
        </span>
        {status?.live && <span className="tag">Maç arası dahil</span>}
      </div>

      <p
        className="muted"
        style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.55 }}
      >
        {homeTeam} - {awayTeam} için model tahmini, maç öncesi form/istatistik,
        aralarındaki maçlar{status?.live ? ' ve maç arası okuması' : ''}.{' '}
        {FREE_MODE
          ? 'Tamamı ücretsiz.'
          : paid
            ? 'Bu rapor için ödemeniz alınmıştı; görüntülemek ücretsiz.'
            : `Görüntülemek için ${cost} kredi düşülür; rapor paylaşımlıdır ve sonraki açışlarınız ücretsizdir.`}
      </p>

      <button
        onClick={() => unlock(true)}
        disabled={mutation.isPending}
        style={{
          marginTop: 14,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 16px',
          borderRadius: 10,
          border: 'none',
          fontSize: 13,
          fontWeight: 600,
          color: '#fff',
          cursor: mutation.isPending ? 'default' : 'pointer',
          opacity: mutation.isPending ? 0.6 : 1,
          background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
        }}
      >
        {mutation.isPending ? (
          <>
            <Loader2 size={15} className="animate-spin" /> Hazırlanıyor…
          </>
        ) : (
          <>
            <FileText size={15} />{' '}
            {FREE_MODE || paid
              ? 'Raporu aç (ücretsiz)'
              : `Önce raporunu aç (${cost} kredi${status?.finished ? ' · yarı fiyat' : ''})`}
          </>
        )}
      </button>

      {fail && (
        <p
          style={{
            margin: '10px 0 0',
            fontSize: 13,
            color: 'var(--neg, #ef4444)',
          }}
        >
          {fail.kind === 'unauthenticated' ? (
            <>
              Raporu açmak için{' '}
              <Link href="/login" style={{ textDecoration: 'underline' }}>
                giriş yapın
              </Link>
              .
            </>
          ) : fail.kind === 'insufficient_credits' ? (
            <>
              Yetersiz kredi (gerekli: {fail.required}).{' '}
              <Link href="/pricing" style={{ textDecoration: 'underline' }}>
                Kredi al
              </Link>
              .
            </>
          ) : fail.kind === 'not_found' ? (
            'Bu maç için rapor bulunamadı.'
          ) : (
            'Rapor oluşturulamadı, lütfen tekrar deneyin.'
          )}
        </p>
      )}
    </div>
  )
}
