'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { formatDayLabel } from '@/lib/format'

interface RecentPred {
  fixtureId: number
  home: string
  away: string
  league: string
  matchDate: string
  pickLabel: string
  predictedScore: string
  prob: number
  score: string
  correct: boolean
}
interface PerfData {
  settled: number
  hits: number
  accuracy: number | null
  valueBets?: {
    settled: number
    wins: number
    profitUnits: number
    roi: number | null
  }
  recent: RecentPred[]
}

/**
 * "Tahmin Defterim" — the model's prediction log: every recently settled call
 * with its predicted scoreline and whether it landed (judged by the predicted
 * scoreline, so a 1-1 call counts as a draw). Reads the same honest track
 * record as the performance page.
 */
export function JournalView() {
  const { data, isLoading } = useQuery<PerfData | null>({
    queryKey: ['performance'],
    queryFn: async () => {
      const res = await fetch('/api/predictions/performance')
      const json = await res.json().catch(() => null)
      return json?.data ?? null
    },
    staleTime: 1000 * 60 * 10,
  })

  const recent = data?.recent ?? []

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Kişisel</div>
          <h1 style={{ marginTop: 6 }}>Tahmin Defterim</h1>
          <div className="sub" style={{ marginTop: 4 }}>
            Modelin son tahminleri, tahmin edilen skor ve sonuçları. İsabet,
            tahmin edilen skora göre değerlendirilir.
          </div>
        </div>
        {data && data.settled > 0 && (
          <div className="right">
            <span className="disc">
              Son {data.settled} sonuçlanan tahminde{' '}
              <b style={{ color: 'var(--txt)' }}>
                {data.hits}/{data.settled}
              </b>{' '}
              isabet{data.accuracy != null ? ` (%${data.accuracy})` : ''}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Defter yükleniyor…
          </p>
        </div>
      ) : recent.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Henüz sonuçlanan tahmin yok. Maçlar oynandıkça modelin tahminleri ve
            sonuçları burada birikecek.
          </p>
        </div>
      ) : (
        <div className="ranklist">
          {recent.map((r) => (
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
                  {r.pickLabel}{' '}
                  {r.predictedScore !== '—' && (
                    <span className="odds">({r.predictedScore})</span>
                  )}
                </div>
              </div>
              <div className="ev">
                <div className="l">Sonuç</div>
                <div className="v">{r.score}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div
        className="card tight"
        style={{ marginTop: 22, display: 'flex', gap: 14 }}
      >
        <span className="disc">
          İsabet, modelin tahmin ettiği skorun sonucuyla
          (ev/beraberlik/deplasman) maç sonucuna uyması demektir. Yalnızca
          bilgilendirme amaçlıdır.
        </span>
      </div>
    </div>
  )
}
