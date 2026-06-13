'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { formatDayLabel } from '@/lib/format'

interface PerfBand {
  n: number
  accuracy: number | null
}
interface PerfData {
  settled: number
  hits: number
  accuracy: number | null
  rps: number | null
  logLoss: number | null
  calibration: { label: string; n: number; accuracy: number | null }[]
  bands: { low: PerfBand; mid: PerfBand; high: PerfBand }
  valueBets?: {
    settled: number
    wins: number
    profitUnits: number
    roi: number | null
    weekly: { week: string; profit: number; cumulative: number }[]
  }
  recent: {
    fixtureId: number
    home: string
    away: string
    league: string
    matchDate: string
    pickLabel: string
    prob: number
    score: string
    correct: boolean
  }[]
}

function Metric({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: 'var(--faint)' }}>{label}</div>
      <div
        className="display"
        style={{ fontSize: 34, fontWeight: 800, marginTop: 6 }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export default function PerformancePage() {
  const { data, isLoading } = useQuery<PerfData | null>({
    queryKey: ['performance'],
    queryFn: async () => {
      const res = await fetch('/api/predictions/performance')
      const json = await res.json().catch(() => null)
      return json?.data ?? null
    },
    staleTime: 1000 * 60 * 30,
  })

  const settled = data?.settled ?? 0

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">AI · Model</div>
          <h1 style={{ marginTop: 6 }}>Performans Merkezi</h1>
          <div className="sub" style={{ marginTop: 4 }}>
            Modelin sonuçlanmış maçlardaki gerçek isabet oranı — kayıtlı
            tahminler maç sonuçlarıyla karşılaştırılır.
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Yükleniyor…
          </p>
        </div>
      ) : settled === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Henüz sonuçlanmış tahmin yok. Tahmin edilen maçlar oynandıkça isabet
            oranı ve geçmiş sonuçlar burada görünecek.
          </p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 16,
              marginBottom: 22,
            }}
          >
            <Metric
              label="1X2 isabet"
              value={`%${data?.accuracy ?? 0}`}
              sub={`${data?.hits ?? 0}/${settled} maç`}
            />
            <Metric
              label="Örneklem"
              value={String(settled)}
              sub="sonuçlanan tahmin"
            />
            {data?.valueBets &&
              data.valueBets.settled > 0 &&
              data.valueBets.roi != null && (
                <Metric
                  label="Değer ROI"
                  value={`${data.valueBets.roi >= 0 ? '+' : ''}%${(data.valueBets.roi * 100).toFixed(1)}`}
                  sub={`${data.valueBets.wins}/${data.valueBets.settled} kupon · ${data.valueBets.profitUnits >= 0 ? '+' : ''}${data.valueBets.profitUnits} birim`}
                />
              )}
            <Metric
              label="Yüksek güven (≥%75)"
              value={
                data?.bands.high.accuracy != null
                  ? `%${data.bands.high.accuracy}`
                  : '—'
              }
              sub={`${data?.bands.high.n ?? 0} maç`}
            />
            <Metric
              label="Orta güven (%60-75)"
              value={
                data?.bands.mid.accuracy != null
                  ? `%${data.bands.mid.accuracy}`
                  : '—'
              }
              sub={`${data?.bands.mid.n ?? 0} maç`}
            />
            <Metric
              label="RPS"
              value={data?.rps != null ? data.rps.toFixed(3) : '—'}
              sub="0=mükemmel · 0.209=rastgele taban"
            />
            <Metric
              label="Log-loss"
              value={data?.logLoss != null ? data.logLoss.toFixed(3) : '—'}
              sub="düşük daha iyi · 1.099=rastgele taban"
            />
          </div>

          {/* Calibration: stated probability vs realized hit rate — the
              scientific test of whether the model's percentages mean what
              they say (a 60% pick should land ~60% of the time). */}
          {(data?.calibration ?? []).some((b) => b.n > 0) && (
            <div className="card" style={{ marginBottom: 22 }}>
              <div className="card-h">
                <h3>Kalibrasyon</h3>
                <span className="hint">
                  söylenen olasılık vs gerçekleşen isabet
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 10,
                }}
              >
                {(data?.calibration ?? []).map((b) => (
                  <div
                    key={b.label}
                    style={{
                      textAlign: 'center',
                      padding: '10px 8px',
                      borderRadius: 12,
                      background: 'var(--panel2, var(--raise))',
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div style={{ fontSize: 11.5, color: 'var(--faint)' }}>
                      Tahmin {b.label}
                    </div>
                    <div
                      style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}
                    >
                      {b.accuracy != null ? `%${b.accuracy}` : '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--dim)' }}>
                      {b.n} maç
                    </div>
                  </div>
                ))}
              </div>
              <p
                className="muted"
                style={{ margin: '10px 0 0', fontSize: 11.5 }}
              >
                İyi kalibre edilmiş bir modelde her kutudaki gerçekleşen isabet,
                söylenen olasılık aralığına yakın olmalıdır.
              </p>
            </div>
          )}

          <div className="card-h" style={{ marginBottom: 12 }}>
            <h3>Son sonuçlanan tahminler</h3>
            <span className="hint">tahmin · sonuç</span>
          </div>
          <div className="ranklist">
            {(data?.recent ?? []).map((r) => (
              <Link
                key={r.fixtureId}
                className="rrow settled"
                href={`/matches/${r.fixtureId}`}
              >
                <span
                  className="rank"
                  style={{ color: r.correct ? 'var(--pos)' : 'var(--neg)' }}
                >
                  {r.correct ? '✓' : '✗'}
                </span>
                <div className="fx">
                  <div className="lg">
                    {r.league} · {formatDayLabel(r.matchDate)}
                  </div>
                  <div className="tm">
                    <span className="nm">{r.home}</span>
                    <span className="vs">-</span>
                    <span className="nm">{r.away}</span>
                  </div>
                </div>
                <div className="pk">
                  <div className="l">Tahmin</div>
                  <div className="v">
                    {r.pickLabel} <span className="odds">%{r.prob}</span>
                  </div>
                </div>
                <div className="ev">
                  <div className="l">Skor</div>
                  <div className="v">{r.score}</div>
                </div>
              </Link>
            ))}
          </div>

          <div
            className="card tight"
            style={{ marginTop: 22, display: 'flex', gap: 14 }}
          >
            <span className="disc">
              İsabet = modelin en yüksek olasılıklı 1X2 seçiminin maç sonucuyla
              uyuşması. Geçmiş performans gelecek sonuçları garanti etmez. Bu
              içerik yalnızca bilgilendirme amaçlıdır.
            </span>
          </div>
        </>
      )}
    </div>
  )
}
