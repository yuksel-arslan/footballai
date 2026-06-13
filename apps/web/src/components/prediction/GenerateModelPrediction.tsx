'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Sparkles } from 'lucide-react'
import { useAIPrediction, type PredictionData } from '@/hooks/use-prediction'
import { AUTO_MODEL_ID } from '@/lib/ai-config'
import type { MatchDetail } from '@/hooks/use-match-detail'

interface PredictStatus {
  stored: boolean
  createdAt: string | null
  paid: boolean
}

/** "az önce" / "25 dk önce" / "bugün 19:32'de" — when the stored prediction
 * was generated, in words a returning viewer expects. */
function whenLabel(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 2) return 'az önce'
  if (mins < 60) return `${mins} dk önce`
  const d = new Date(iso)
  const hh = `${d.getHours()}`.padStart(2, '0')
  const mm = `${d.getMinutes()}`.padStart(2, '0')
  return `${hh}:${mm}'de`
}

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

  // Live status: does a stored prediction exist, when, and did THIS viewer
  // already pay (re-viewing is free)? The fixture row alone can be stale.
  const fxId = fixture.apiId || fixture.id
  const { data: status } = useQuery<PredictStatus | null>({
    queryKey: ['predict-status', fxId],
    queryFn: async () => {
      const res = await fetch(`/api/predict/status?fixtureId=${fxId}`, {
        credentials: 'include',
      })
      const json = await res.json().catch(() => null)
      return json?.data ?? null
    },
    staleTime: 30 * 1000,
  })

  const generate = () => {
    // Guard against an accidental re-press: if the analysis already exists but
    // THIS viewer hasn't paid, revealing it deducts credits — confirm first.
    const alreadyStored = !!status?.stored || hasStored
    const alreadyPaid = !!status?.paid
    if (alreadyStored && !alreadyPaid) {
      const ok = window.confirm(
        'Bu maç için tahmin zaten üretilmiş. Görüntülemek için 4 kredi düşülecek. Devam edilsin mi?'
      )
      if (!ok) return
    }
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
  }

  // The viewer already paid for this fixture's prediction: showing it costs
  // nothing, so load it without making them ask again.
  const autoLoaded = useRef(false)
  useEffect(() => {
    if (
      status?.paid &&
      status?.stored &&
      !result &&
      !mutation.isPending &&
      !autoLoaded.current
    ) {
      autoLoaded.current = true
      generate()
    }
  }, [status?.paid, status?.stored, result, mutation.isPending, generate])

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
  const stored = !!status?.stored || hasStored
  const paid = !!status?.paid
  const when = status?.createdAt ? whenLabel(status.createdAt) : null

  return (
    <div className="card">
      <p style={{ margin: 0, fontWeight: 600 }}>
        {stored && paid
          ? `Tahmininiz hazır${when ? ` — ${when} üretildi` : ''}`
          : stored
            ? `Bu maç için tahmin ${when ? `${when} ` : ''}üretildi — görmek ister misiniz?`
            : 'Bu maç için model tahmini üretebilirsiniz'}
      </p>
      <p
        className="muted"
        style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.5 }}
      >
        {stored && paid
          ? 'Bu tahmin için ödemeniz alınmıştı; tekrar görüntülemek ücretsiz, yükleniyor…'
          : stored
            ? 'Yapay zekâ tahmini (kazanma olasılıkları, tahmini skor ve analiz) hazır. Görüntülemek için 4 kredi düşülür; sonrasında aynı maçı her açışınızda ücretsizdir.'
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
            {stored ? 'Yükleniyor…' : 'Üretiliyor…'}
          </>
        ) : (
          <>
            <Sparkles size={15} />{' '}
            {stored && paid
              ? 'Tahmini gör (ücretsiz)'
              : stored
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
