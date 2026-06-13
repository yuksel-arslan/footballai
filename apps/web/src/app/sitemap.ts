import { MetadataRoute } from 'next'

const SITE_URL = 'https://footballai.io'

// League codes for dynamic routes
const LEAGUES = [
  'PL',
  'PD',
  'BL1',
  'SA',
  'FL1',
  'TSL',
  'PPL',
  'DED',
  'CL',
  'EL',
  'WC',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/matches`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/predictions`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/reports`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/standings`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/favorites`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ]

  // League pages
  const leaguePages: MetadataRoute.Sitemap = LEAGUES.map((code) => ({
    url: `${SITE_URL}/league/${code}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  // Per-match report pages — enumerated from the live report-cards feed so
  // Google can discover every upcoming/finished match's report. Fails open
  // (just the static + league set) when the backend isn't reachable.
  let reportPages: MetadataRoute.Sitemap = []
  const gateway =
    process.env.API_GATEWAY_URL || process.env.NEXT_PUBLIC_API_URL || ''
  if (gateway) {
    try {
      const res = await fetch(
        `${gateway}/api/predictions/report-cards?limit=60`,
        { next: { revalidate: 3600 } }
      )
      if (res.ok) {
        const json = (await res.json()) as {
          data?: { fixtureId: number; matchDate?: string }[]
        }
        reportPages = (json.data ?? [])
          .filter((c) => Number.isFinite(c.fixtureId))
          .map((c) => ({
            url: `${SITE_URL}/reports/${c.fixtureId}`,
            lastModified: c.matchDate ? new Date(c.matchDate) : now,
            changeFrequency: 'daily' as const,
            priority: 0.6,
          }))
      }
    } catch {
      // backend unreachable — emit the static set only
    }
  }

  return [...staticPages, ...leaguePages, ...reportPages]
}
