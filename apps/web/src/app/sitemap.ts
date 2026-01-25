import { MetadataRoute } from 'next'

const SITE_URL = 'https://futballai.com'

// League codes for dynamic routes
const LEAGUES = ['PL', 'PD', 'BL1', 'SA', 'FL1', 'TSL', 'PPL', 'DED', 'CL', 'EL']

export default function sitemap(): MetadataRoute.Sitemap {
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

  return [...staticPages, ...leaguePages]
}
