'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { Share2, Check } from 'lucide-react'
import { useMatchDetail } from '@/hooks/use-match-detail'
import { MatchReportTabs } from '@/components/prediction/MatchReportTabs'
import { LikeButton } from '@/components/app/like-button'
import { AdSlot } from '@/components/ads/ad-slot'
import { AD_SLOTS } from '@/lib/ads'
import { formatDayLabel, formatTime } from '@/lib/format'

interface ReportPageProps {
  params: Promise<{ fixtureId: string }>
}

/**
 * Shareable report page (the "published" surface): one URL per fixture with the
 * same Maç öncesi / Maç arası / Maç sonrası phases as the match page. "Maç
 * öncesi" unlocks the pre-match report for 6 credits (once per fixture); the
 * in-play and post-match phases are free. The link is shareable so anyone can
 * open it and unlock their own view.
 */
export default function ReportDetailPage({ params }: ReportPageProps) {
  const { fixtureId: idStr } = use(params)
  const fixtureId = Number(idStr)
  const { data: fx, isLoading } = useMatchDetail(fixtureId)
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.share) {
        await navigator.share({
          title: fx
            ? `${fx.homeTeam.name} - ${fx.awayTeam.name} raporu`
            : 'Maç raporu',
          url,
        })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // user cancelled share / clipboard blocked — no-op
    }
  }

  if (isLoading) {
    return (
      <div className="page">
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Yükleniyor…
          </p>
        </div>
      </div>
    )
  }
  if (!fx) {
    return (
      <div className="page">
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Maç bulunamadı.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="crumb">
        <Link href="/reports">Raporlar</Link>
        <span className="sep">/</span>
        <Link href={`/matches/${fx.apiId}`}>
          {fx.homeTeam.name} - {fx.awayTeam.name}
        </Link>
        <span className="sep">/</span>
        <span className="cur">Rapor</span>
      </div>

      <div className="page-head">
        <div>
          <div className="kicker">Maç Raporu</div>
          <h1 style={{ marginTop: 6 }}>
            {fx.homeTeam.name} - {fx.awayTeam.name}
          </h1>
          <div className="sub" style={{ marginTop: 4 }}>
            {fx.league?.name} · {formatDayLabel(fx.matchDate)}{' '}
            {formatTime(fx.matchDate)}
          </div>
        </div>
        <div className="right" style={{ display: 'flex', gap: 8 }}>
          <LikeButton fixtureId={fx.apiId} />
          <button
            onClick={share}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid var(--line2)',
              background: 'transparent',
              color: 'var(--txt)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {copied ? <Check size={15} /> : <Share2 size={15} />}
            {copied ? 'Bağlantı kopyalandı' : 'Paylaş'}
          </button>
        </div>
      </div>

      <MatchReportTabs
        fixtureId={fx.apiId}
        homeTeam={fx.homeTeam.name}
        awayTeam={fx.awayTeam.name}
        status={fx.status}
      />

      <AdSlot slot={AD_SLOTS.inArticle} className="in-article" />
    </div>
  )
}
