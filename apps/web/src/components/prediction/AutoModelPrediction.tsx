'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { PredictionData } from '@/hooks/use-prediction'

/**
 * Automatic "AI tahmini" card for the free product: reveals the stored AI
 * prediction (produced automatically by the pre-match flow) read-only — no
 * button, no credits, no manual generation. Renders nothing until a prediction
 * exists; the pre/in/post report flow above covers matches without one yet.
 */
export function AutoModelPrediction({
  fixtureId,
  homeTeam,
  awayTeam,
  onResult,
}: {
  fixtureId: number
  homeTeam: string
  awayTeam: string
  onResult?: (r: PredictionData) => void
}) {
  const { data, isLoading } = useQuery<PredictionData | null>({
    queryKey: ['predict-result', fixtureId],
    queryFn: async () => {
      const res = await fetch(`/api/predict/result?fixtureId=${fixtureId}`)
      const json = await res.json().catch(() => null)
      return json?.data ?? null
    },
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (data) onResult?.(data)
  }, [data, onResult])

  if (isLoading) {
    return (
      <div className="card">
        <p className="muted" style={{ margin: 0 }}>
          AI tahmini yükleniyor…
        </p>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="card">
        <div className="vrow">
          <span className="vbadge">AI tahmini</span>
        </div>
        <p
          className="muted"
          style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.5 }}
        >
          Bu maç için otomatik AI tahmini henüz hazır değil. Maç öncesi analiz
          akışı çalıştığında burada görünecek.
        </p>
      </div>
    )
  }

  const probs: [string, number][] = [
    [homeTeam, data.homeWinProb],
    ['Beraberlik', data.drawProb],
    [awayTeam, data.awayWinProb],
  ]
  const top = probs.reduce((a, b) => (b[1] > a[1] ? b : a))

  return (
    <div className="card verdict">
      <div className="vrow">
        <span className="vbadge">AI tahmini</span>
        <span className="muted" style={{ fontSize: 13 }}>
          {data.modelVersion}
        </span>
      </div>
      <div className="pick">{top[0]}</div>
      <div className="vmeta">
        <div className="vstat">
          <div className="l">Olasılık</div>
          <div className="v pos">%{top[1]}</div>
        </div>
        <div className="vstat">
          <div className="l">Güven</div>
          <div className="v">%{data.confidence}</div>
        </div>
        {data.predictedHomeScore != null && (
          <div className="vstat">
            <div className="l">Tahmini skor</div>
            <div className="v">
              {data.predictedHomeScore}-{data.predictedAwayScore}
            </div>
          </div>
        )}
      </div>
      {data.explanation && (
        <p
          className="muted"
          style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.5 }}
        >
          {data.explanation}
        </p>
      )}
      {data.keyFactors?.length > 0 && (
        <ul
          className="muted"
          style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5 }}
        >
          {data.keyFactors.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
