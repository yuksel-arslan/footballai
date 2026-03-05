/**
 * RAG (Retrieval-Augmented Generation) context service.
 *
 * Fetches enrichment data before AI predictions:
 *   1. Injuries/suspensions from API-Football
 *   2. Recent team news via web search (if search API configured)
 *
 * All fetches are best-effort: failures are silently ignored so
 * predictions still work without RAG enrichment.
 */

// ── Types ────────────────────────────────────────────────────────
export interface InjuryInfo {
  playerName: string
  reason: string // "Knee Injury", "Suspended", etc.
  type: string // "Missing Fixture", "Doubtful", "Questionable"
}

export interface RAGContext {
  homeInjuries: InjuryInfo[]
  awayInjuries: InjuryInfo[]
  newsSnippets: string[] // 1-liner news headlines relevant to this match
}

// ── Config ───────────────────────────────────────────────────────
const PROXY_URL = '/api/football'

// Search API keys – checked in priority order:
//   1. Brave Search (free 2 000 req/mo)
//   2. Google Custom Search (free 100 req/day)
const BRAVE_SEARCH_KEY =
  process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY || ''
const GOOGLE_SEARCH_KEY =
  process.env.SEARCH_API_KEY || process.env.GOOGLE_SEARCH_API_KEY || ''
const GOOGLE_CSE_ID =
  process.env.SEARCH_ENGINE_ID || process.env.GOOGLE_CSE_ID || ''

// In-memory cache (key → { data, ts })
const ragCache = new Map<string, { data: RAGContext; ts: number }>()
const RAG_CACHE_TTL = 30 * 60 * 1000 // 30 minutes

function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

// ── Injuries ─────────────────────────────────────────────────────

async function fetchInjuries(
  teamId: number,
  fixtureId?: number
): Promise<InjuryInfo[]> {
  try {
    // API-Football /injuries endpoint: ?team={id}&season={season}
    // or /injuries?fixture={fixtureId}
    const now = new Date()
    const season =
      now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear()
    const endpoint = fixtureId
      ? `/injuries?fixture=${fixtureId}`
      : `/injuries?team=${teamId}&season=${season}`

    const res = await fetch(
      `${baseUrl()}${PROXY_URL}?endpoint=${encodeURIComponent(endpoint)}&source=api-football`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []

    const data = await res.json()
    if (!data?.response?.length) return []

    return data.response.slice(0, 8).map((item: any) => ({
      playerName: item.player?.name || 'Unknown',
      reason: item.player?.reason || item.player?.type || 'Injury',
      type: item.player?.type || 'Missing Fixture',
    }))
  } catch {
    return []
  }
}

// ── Web Search for News ──────────────────────────────────────────

/** Brave Web Search API (free tier: 2 000 req/month) */
async function searchBrave(query: string): Promise<string[]> {
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&freshness=pw`,
    {
      headers: { 'X-Subscription-Token': BRAVE_SEARCH_KEY },
      signal: AbortSignal.timeout(5000),
    }
  )
  if (!res.ok) return []

  const data = await res.json()
  if (!data?.web?.results?.length) return []

  return data.web.results
    .slice(0, 5)
    .map((r: any) => r.description?.replace(/<\/?[^>]+>/g, '').trim())
    .filter(Boolean)
}

/** Google Custom Search API (free tier: 100 req/day) */
async function searchGoogle(query: string): Promise<string[]> {
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&num=5&dateRestrict=d3`

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) return []

  const data = await res.json()
  if (!data?.items?.length) return []

  return data.items
    .slice(0, 5)
    .map((item: any) => item.snippet?.replace(/\n/g, ' ').trim())
    .filter(Boolean)
}

async function searchTeamNews(
  homeTeam: string,
  awayTeam: string,
  league: string
): Promise<string[]> {
  const query = `${homeTeam} vs ${awayTeam} ${league} match preview injury news`

  try {
    // 1. Try Brave Search first (free 2 000 req/mo)
    if (BRAVE_SEARCH_KEY) {
      const results = await searchBrave(query)
      if (results.length > 0) return results
    }

    // 2. Fall back to Google Custom Search
    if (GOOGLE_SEARCH_KEY && GOOGLE_CSE_ID) {
      return await searchGoogle(query)
    }

    return []
  } catch {
    return []
  }
}

// ── Main fetch function ──────────────────────────────────────────

export async function fetchRAGContext(
  homeTeamId: number,
  awayTeamId: number,
  homeTeam: string,
  awayTeam: string,
  league: string,
  fixtureId?: number
): Promise<RAGContext> {
  const cacheKey = `${homeTeamId}-${awayTeamId}-${fixtureId || ''}`
  const cached = ragCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < RAG_CACHE_TTL) {
    return cached.data
  }

  // Fetch all RAG data in parallel (best-effort)
  const [homeInjuries, awayInjuries, newsSnippets] = await Promise.all([
    fetchInjuries(homeTeamId, fixtureId),
    fetchInjuries(awayTeamId, fixtureId),
    searchTeamNews(homeTeam, awayTeam, league),
  ])

  const context: RAGContext = { homeInjuries, awayInjuries, newsSnippets }

  // Cache the result
  ragCache.set(cacheKey, { data: context, ts: Date.now() })
  // Evict old entries
  if (ragCache.size > 500) {
    const entries = Array.from(ragCache.entries())
    entries.slice(0, 250).forEach(([k]) => ragCache.delete(k))
  }

  return context
}

// ── Format for AI prompt ─────────────────────────────────────────

export function formatRAGForPrompt(
  ctx: RAGContext,
  homeTeam: string,
  awayTeam: string
): string {
  const parts: string[] = []

  if (ctx.homeInjuries.length > 0) {
    const list = ctx.homeInjuries
      .map((i) => `  - ${i.playerName} (${i.reason})`)
      .join('\n')
    parts.push(`${homeTeam} injuries/suspensions:\n${list}`)
  }

  if (ctx.awayInjuries.length > 0) {
    const list = ctx.awayInjuries
      .map((i) => `  - ${i.playerName} (${i.reason})`)
      .join('\n')
    parts.push(`${awayTeam} injuries/suspensions:\n${list}`)
  }

  if (ctx.newsSnippets.length > 0) {
    parts.push(
      `Recent news context:\n${ctx.newsSnippets.map((s) => `  - ${s}`).join('\n')}`
    )
  }

  return parts.length > 0 ? parts.join('\n\n') : ''
}
