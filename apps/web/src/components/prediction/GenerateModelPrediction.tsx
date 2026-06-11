'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Sparkles } from 'lucide-react'
import { useAIPrediction, type PredictionData } from '@/hooks/use-prediction'
import { AUTO_MODEL_ID } from '@/lib/ai-config'
import type { MatchDetail } from '@/hooks/use-match-detail'

/**
 * Empty-state for the "Model tahmini" box: explains why no prediction exists
 * yet, and gates it behind a 4-credit action: each viewer pays once to
 * reveal it. The computation is shared (server reuses a stored result), so
 * paying after someone else generated it does not recompute. `hasStored`
 * tells us whether a result already exists (button says "view" vs "generate").
 */
export function GenerateModelPrediction({
  fixture,
  hasStored = false,
  onResult,
}: {
  fixture: MatchDetail
  hasStored?: boolean
  onResult?: (r: PredictionData) => void
}) {
  const mutation = useAIPrediction()
  const [result, setResult] = useState<PredictionData | null>(null)

  const generate = () =>
    mutation.mutate(
      {
        fixtureId: fixture.apiId || fixture.id,
        modelId: AUTO_MODEL_ID,
        match: {
          homeTeam: fixture.homeTeam.name,
          awayTeam: fixture.awayTeam.name,
          league: fixture.league.name,
          homeTeamId: fixture.homeTeam.id,
          awayTeamId: fixture.awayTeam.id,
          matchStatus: fixture.status,
          minute: fixture.minute ?? null,
          currentHomeScore: fixture.homeScore ?? null,
          currentAwayScore: fixture.awayScore ?? null,
        },
      },
      {
        onSuccess: (r) => {
          setResult(r.prediction)
          onResult?.(r.prediction)
        },
      }
    )

  if (result) {
    const probs: [string, number][] = [
      [fixture.homeTeam.name, result.homeWinProb],
      ['Beraberlik', result.drawProb],
      [fixture.awayTeam.name, result.awayWinProb],
    ]
    const top = probs.reduce((a, b) => (b[1] > a[1] ? b : a))
    return (
      <div className="card verdict">
        <div className="vrow">
          <span className="vbadge">AI tahmini</span>
          <span className="muted" style={{ fontSize: 13 }}>
            {result.modelVersion}
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
            <div className="v">%{result.confidence}</div>
          </div>
          {result.predictedHomeScore != null && (
            <div className="vstat">
              <div className="l">Tahmini skor</div>
              <div className="v">
                {result.predictedHomeScore}-{result.predictedAwayScore}
              </div>
            </div>
          )}
        </div>
        {result.explanation && (
          <p
            className="muted"
            style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.5 }}
          >
            {result.explanation}
          </p>
        )}
        {result.keyFactors?.length > 0 && (
          <ul
            className="muted"
            style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5 }}
          >
            {result.keyFactors.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const fail = mutation.error?.failure

  return (
    <div className="card">
      <p style={{ margin: 0, fontWeight: 600 }}>
        {hasStored
          ? 'Yapay zekâ tahmini hazır'
          : 'Bu maç için henüz model tahmini üretilmedi'}
      </p>
      <p
        className="muted"
        style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.5 }}
      >
        {hasStored
          ? 'Bu maç için yapay zekâ tahmini (kazanma olasılıkları, tahmini skor ve analiz) hazır. Görüntülemek için 4 kredi düşülür; aynı maçı tekrar açtığınızda ücretsizdir.'
          : 'Aşağıdaki düğmeyle bu maç için yapay zekâ tahminini (kazanma olasılıkları, skor ve kısa analiz) üretebilirsiniz. 4 kredi düşülür; sonuç tüm kullanıcılarla paylaşılır, aynı maçı tekrar açtığınızda ücretsizdir.'}
      </p>

      <button
        onClick={generate}
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
          background: 'linear-gradient(135deg, #10B981, #059669)',
        }}
      >
        {mutation.isPending ? (
          <>
            <Loader2 size={15} className="animate-spin" />{' '}
            {hasStored ? 'Yükleniyor…' : 'Üretiliyor…'}
          </>
        ) : (
          <>
            <Sparkles size={15} />{' '}
            {hasStored
              ? 'Tahmini gör (4 kredi)'
              : 'Şimdi tahmin üret (4 kredi)'}
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
              Tahmin üretmek için{' '}
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
          ) : fail.kind === 'invalid_model' ? (
            'AI sağlayıcısı yapılandırılmamış.'
          ) : (
            `Tahmin üretilemedi${fail.kind === 'prediction_failed' && fail.message ? ` (${fail.message})` : ''}.`
          )}
        </p>
      )}
    </div>
  )
}
