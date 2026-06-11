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
  bands: { low: PerfBand; mid: PerfBand; high: PerfBand }
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
          </div>

          <div className="card-h" style={{ marginBottom: 12 }}>
            <h3>Son sonuçlanan tahminler</h3>
            <span className="hint">tahmin · sonuç</span>
          </div>
          <div className="ranklist">
            {(data?.recent ?? []).map((r) => (
              <Link
                key={r.fixtureId}
                className="rrow"
                href={`/matches/${r.fixtureId}`}
                style={{ gridTemplateColumns: '34px 1fr 150px 90px' }}
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
              uyuşması. Geçmiş performans gelecek sonuçları garanti etmez. 18+ ·
              Sorumlu oyna.
            </span>
          </div>
        </>
      )}
    </div>
  )
}
