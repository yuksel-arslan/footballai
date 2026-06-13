import type { Metadata } from 'next'
import { GATEWAY_URL } from '@/lib/service-urls'

const SITE_URL = 'https://footballai.io'

interface FixtureLite {
  apiId?: number
  homeTeam?: { name?: string }
  awayTeam?: { name?: string }
  league?: { name?: string }
  matchDate?: string
  status?: string
  homeScore?: number | null
  awayScore?: number | null
}

/**
 * Server-side fixture lookup for SEO (title/description + JSON-LD). Public
 * gateway endpoint; cached so generateMetadata + the layout body share one
 * round-trip (fetch is deduped per request by Next). Fails open to null.
 */
async function fetchFixture(id: string): Promise<FixtureLite | null> {
  if (!GATEWAY_URL) return null
  try {
    const res = await fetch(
      `${GATEWAY_URL}/api/fixtures/${encodeURIComponent(id)}`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return null
    const json = await res.json()
    return (json.data ?? json) as FixtureLite
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ fixtureId: string }>
}): Promise<Metadata> {
  const { fixtureId } = await params
  const fx = await fetchFixture(fixtureId)
  const url = `${SITE_URL}/reports/${fixtureId}`

  if (!fx?.homeTeam?.name || !fx?.awayTeam?.name) {
    return { title: 'Maç Raporu', alternates: { canonical: url } }
  }

  const home = fx.homeTeam.name
  const away = fx.awayTeam.name
  const league = fx.league?.name ?? ''
  const finished = fx.status === 'FINISHED'
  const score =
    finished && fx.homeScore != null && fx.awayScore != null
      ? ` ${fx.homeScore}-${fx.awayScore}`
      : ''
  const title = `${home} - ${away}${score} — Maç Raporu`
  const description = finished
    ? `${home}${score} ${away} maç sonu analizi: model isabeti, form, istatistik, aralarındaki maçlar ve değerlendirme.${league ? ` ${league}.` : ''}`
    : `${home} - ${away} maç öncesi analiz ve yapay zekâ tahmini: kazanma olasılıkları, form, istatistik ve aralarındaki maçlar.${league ? ` ${league}.` : ''}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: 'FootballAI',
      title,
      description,
    },
    twitter: { card: 'summary', title, description },
  }
}

export default async function ReportDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ fixtureId: string }>
}) {
  const { fixtureId } = await params
  const fx = await fetchFixture(fixtureId)

  // Structured data for rich results: a soccer SportsEvent with both teams.
  const jsonLd =
    fx?.homeTeam?.name && fx?.awayTeam?.name
      ? {
          '@context': 'https://schema.org',
          '@type': 'SportsEvent',
          name: `${fx.homeTeam.name} - ${fx.awayTeam.name}`,
          sport: 'Soccer',
          url: `${SITE_URL}/reports/${fixtureId}`,
          ...(fx.matchDate ? { startDate: fx.matchDate } : {}),
          ...(fx.status === 'FINISHED'
            ? { eventStatus: 'https://schema.org/EventScheduled' }
            : {}),
          homeTeam: { '@type': 'SportsTeam', name: fx.homeTeam.name },
          awayTeam: { '@type': 'SportsTeam', name: fx.awayTeam.name },
          ...(fx.league?.name
            ? {
                superEvent: {
                  '@type': 'SportsEvent',
                  name: fx.league.name,
                },
              }
            : {}),
        }
      : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  )
}
