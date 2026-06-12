import { LEAGUES, type Standing } from './reference-data'

// API Gateway URL (primary) or Match Service URL (direct)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Use internal Next.js proxy to avoid CORS issues
const PROXY_URL = '/api/football'

export class ApiConfigError extends Error {
  constructor() {
    super('API key not configured')
    this.name = 'ApiConfigError'
  }
}

export interface Team {
  id: number
  name: string
  logoUrl?: string
  code?: string
}

export interface League {
  id: number
  name: string
  country: string
  logoUrl?: string
  countryCode?: string
  language?: string
}

export interface Prediction {
  homeWinProb: number
  drawProb: number
  awayWinProb: number
  predictedHomeScore?: number
  predictedAwayScore?: number
  confidence: number
}

export interface Fixture {
  id: number
  apiId: number
  homeTeam: Team
  awayTeam: Team
  league: League
  matchDate: string
  status:
    | 'SCHEDULED'
    | 'LIVE'
    | 'HALFTIME'
    | 'FINISHED'
    | 'POSTPONED'
    | 'CANCELLED'
  homeScore?: number
  awayScore?: number
  venue?: string
  referee?: string
  round?: string
  minute?: number
  predictions?: Prediction[]
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

// Football-Data.org free tier supported competitions
const FOOTBALL_DATA_FREE_LEAGUES = new Set([
  'PL',
  'BL1',
  'PD',
  'SA',
  'FL1',
  'CL',
  'PPL',
  'DED',
  'ELC',
  'BSA',
  'EC',
  'WC',
])

// API-Football league ID mapping
const API_FOOTBALL_LEAGUES: Record<string, number> = {
  PL: 39,
  PD: 140,
  BL1: 78,
  SA: 135,
  FL1: 61,
  TSL: 203,
  PPL: 94,
  DED: 88,
  CL: 2,
  EL: 3,
  WC: 1,
}

// Leagues only available via API-Football (not in Football-Data.org free tier)
const API_FOOTBALL_ONLY_LEAGUES = Object.entries(API_FOOTBALL_LEAGUES)
  .filter(([code]) => !FOOTBALL_DATA_FREE_LEAGUES.has(code))
  .map(([, id]) => id)

// Curated competitions we operate on (API-Football league ids) — betting-site
// coverage. Used to filter global API-Football feeds (live=all, by-date) so
// lower divisions, women's and U17/U19 youth matches never reach the UI.
// KEEP IN SYNC with CURATED_LEAGUE_IDS in
// services/match-service/src/services/fixture-service.ts.
const CURATED_LEAGUE_IDS = new Set<number>([
  ...Object.values(API_FOOTBALL_LEAGUES),
  // European leagues + cups
  144,
  179,
  197,
  207,
  218,
  119,
  103,
  113,
  106,
  40,
  45,
  143,
  137,
  81,
  66,
  // Americas / Asia
  71,
  128,
  253,
  262,
  98,
  292,
  307,
  // European + international tournaments
  848,
  4,
  5,
  9,
  6,
  7,
  13,
  11,
  15,
])

/** Filter a global API-Football fixtures response down to curated competitions. */
function curatedApiFixtures(response: any[]): Fixture[] {
  return (response || [])
    .filter((m) => CURATED_LEAGUE_IDS.has(m?.league?.id))
    .map(convertApiFootballMatch)
}

/**
 * Normalize tournament group labels from both providers to Turkish:
 * Football-Data "GROUP_A" / API-Football "Group A" -> "Grup A".
 */
function formatGroupLabel(raw?: string | null): string | undefined {
  if (!raw) return undefined
  const m = raw.match(/^(?:GROUP[_\s]|Group\s+)(.+)$/i)
  return m ? `Grup ${m[1]}` : raw
}

// Football-Data.org status mapping
const STATUS_MAP: Record<string, Fixture['status']> = {
  SCHEDULED: 'SCHEDULED',
  TIMED: 'SCHEDULED',
  IN_PLAY: 'LIVE',
  PAUSED: 'HALFTIME',
  FINISHED: 'FINISHED',
  POSTPONED: 'POSTPONED',
  CANCELLED: 'CANCELLED',
  SUSPENDED: 'POSTPONED',
}

/**
 * Map a match-service DB fixture row (Prisma include: homeTeam/awayTeam/league)
 * to the web Fixture shape. League/team ids are normalized to provider apiIds
 * when present so grouping and active-competition checks line up with feed
 * fixtures.
 */
function convertDbFixture(row: any): Fixture {
  return {
    id: row.apiId || row.id,
    apiId: row.apiId,
    homeTeam: {
      id: row.homeTeam?.apiId || row.homeTeam?.id || 0,
      name: row.homeTeam?.name || 'Unknown',
      logoUrl: row.homeTeam?.logoUrl,
    },
    awayTeam: {
      id: row.awayTeam?.apiId || row.awayTeam?.id || 0,
      name: row.awayTeam?.name || 'Unknown',
      logoUrl: row.awayTeam?.logoUrl,
    },
    league: {
      id: row.league?.apiId || row.league?.id || 0,
      name: row.league?.name || 'Unknown',
      country: row.league?.country || '',
      logoUrl: row.league?.logoUrl,
    },
    matchDate: row.matchDate,
    status: row.status || 'FINISHED',
    homeScore: row.homeScore ?? undefined,
    awayScore: row.awayScore ?? undefined,
    venue: row.venue,
    round: row.round,
    minute: row.minute,
  }
}

function convertMatch(match: any): Fixture {
  // Football-Data.org doesn't provide elapsed minutes; estimate from kickoff
  let minute = match.minute as number | undefined
  if (
    !minute &&
    match.utcDate &&
    (match.status === 'IN_PLAY' || match.status === 'PAUSED')
  ) {
    const kickoff = new Date(match.utcDate).getTime()
    const elapsed = Math.floor((Date.now() - kickoff) / 60000)
    if (elapsed >= 0 && elapsed <= 120) {
      minute = match.status === 'PAUSED' ? 45 : elapsed
    }
  }

  return {
    id: match.id,
    apiId: match.id,
    homeTeam: {
      id: match.homeTeam?.id || 0,
      name: match.homeTeam?.name || 'Unknown',
      code: match.homeTeam?.tla,
      logoUrl: match.homeTeam?.crest,
    },
    awayTeam: {
      id: match.awayTeam?.id || 0,
      name: match.awayTeam?.name || 'Unknown',
      code: match.awayTeam?.tla,
      logoUrl: match.awayTeam?.crest,
    },
    league: {
      id: match.competition?.id || 0,
      name: match.competition?.name || 'Unknown',
      country: match.competition?.area?.name || '',
      logoUrl: match.competition?.emblem,
    },
    matchDate: match.utcDate,
    status: STATUS_MAP[match.status] || 'SCHEDULED',
    homeScore: match.score?.fullTime?.home ?? undefined,
    awayScore: match.score?.fullTime?.away ?? undefined,
    venue: match.venue,
    referee: match.referees?.[0]?.name,
    round: match.matchday ? `Matchday ${match.matchday}` : match.stage,
    minute,
  }
}

function convertApiFootballMatch(match: any): Fixture {
  const statusMap: Record<string, Fixture['status']> = {
    NS: 'SCHEDULED',
    TBD: 'SCHEDULED',
    '1H': 'LIVE',
    '2H': 'LIVE',
    HT: 'HALFTIME',
    FT: 'FINISHED',
    AET: 'FINISHED',
    PEN: 'FINISHED',
    PST: 'POSTPONED',
    CANC: 'CANCELLED',
  }

  return {
    id: match.fixture?.id || 0,
    apiId: match.fixture?.id || 0,
    homeTeam: {
      id: match.teams?.home?.id || 0,
      name: match.teams?.home?.name || 'Unknown',
      logoUrl: match.teams?.home?.logo,
    },
    awayTeam: {
      id: match.teams?.away?.id || 0,
      name: match.teams?.away?.name || 'Unknown',
      logoUrl: match.teams?.away?.logo,
    },
    league: {
      id: match.league?.id || 0,
      name: match.league?.name || 'Unknown',
      country: match.league?.country || '',
      logoUrl: match.league?.logo,
    },
    matchDate: match.fixture?.date,
    status: statusMap[match.fixture?.status?.short] || 'SCHEDULED',
    homeScore: match.goals?.home ?? undefined,
    awayScore: match.goals?.away ?? undefined,
    venue: match.fixture?.venue?.name,
    referee: match.fixture?.referee,
    round: match.league?.round,
    minute: match.fixture?.status?.elapsed,
  }
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /** Fetch from Football-Data.org via Next.js proxy */
  private async fetchFootballData<T>(endpoint: string): Promise<T | null> {
    try {
      const res = await fetch(
        `${PROXY_URL}?endpoint=${encodeURIComponent(endpoint)}&source=football-data`,
        {
          next: { revalidate: 60 },
        }
      )

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        if (res.status === 429 || errorData.rateLimited) {
          console.warn(
            'Football-Data.org rate limit exceeded, trying fallback...'
          )
        }
        return null
      }

      return await res.json()
    } catch {
      return null
    }
  }

  /** Fetch from API-Football via Next.js proxy (fallback) */
  private async fetchApiFootball<T>(endpoint: string): Promise<T | null> {
    try {
      const res = await fetch(
        `${PROXY_URL}?endpoint=${encodeURIComponent(endpoint)}&source=api-football`,
        {
          next: { revalidate: 60 },
        }
      )

      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }

  /** Fetch from backend service (database data via API gateway) */
  private async fetchBackend<T>(endpoint: string): Promise<T | null> {
    try {
      // Skip backend calls during SSR when gateway URL isn't configured
      // (proxy routes return 503 immediately, so this avoids unnecessary round trips)
      if (typeof window === 'undefined') {
        const gwUrl =
          process.env.API_GATEWAY_URL || process.env.NEXT_PUBLIC_API_URL || ''
        if (!gwUrl) return null
      }

      const res = await fetch(`/api${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const json = await res.json()
      return json.data || json
    } catch {
      return null
    }
  }

  /** Direct fetch to backend service */
  private async fetchService<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    })

    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`)
    }

    const json = await res.json()
    return json.data || json
  }

  /** Fetch upcoming fixtures from API-Football for leagues not covered by Football-Data.org */
  private async fetchApiFootballOnlyLeagues(
    statusFilter?: string
  ): Promise<Fixture[]> {
    const now = new Date()
    const season =
      now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear()
    const results: Fixture[] = []

    const fetches = API_FOOTBALL_ONLY_LEAGUES.map(async (leagueId) => {
      const params = statusFilter
        ? `/fixtures?league=${leagueId}&season=${season}&${statusFilter}`
        : `/fixtures?league=${leagueId}&next=10`
      const apiData = await this.fetchApiFootball<any>(params)
      if (apiData?.response) {
        return curatedApiFixtures(apiData.response)
      }
      return []
    })

    const allResults = await Promise.all(fetches)
    for (const r of allResults) results.push(...r)
    return results
  }

  /**
   * THE DATABASE IS THE SINGLE SOURCE OF TRUTH for the match lists. Every
   * match lives in one table with a status column (SCHEDULED → LIVE →
   * FINISHED); match-service ingests providers via cron, refreshes live
   * state, and finalizes finished matches. The tabs are just views over
   * that status — no list is fed from a different source than another, so
   * a match moves Yaklaşan → Canlı → Biten consistently.
   */
  async getUpcomingFixtures(): Promise<Fixture[]> {
    const db = await this.fetchBackend<any>('/fixtures/upcoming?limit=200')
    const rows: any[] = Array.isArray(db) ? db : (db?.data ?? [])
    return rows
      .map(convertDbFixture)
      .sort(
        (a, b) =>
          new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
      )
  }

  async getLiveFixtures(): Promise<Fixture[]> {
    // The backend refreshes from the live feed (cooldown-guarded) before
    // answering, and flips just-finished matches to FINISHED.
    const db = await this.fetchBackend<any>('/fixtures/live')
    const rows: any[] = Array.isArray(db) ? db : (db?.data ?? [])
    return rows.map(convertDbFixture)
  }

  async getFinishedFixtures(): Promise<Fixture[]> {
    // DB-only, like upcoming/live: "Biten" is simply the rows whose status
    // flipped to FINISHED (live updater + finalize cron). Last 9 days.
    const nineDaysAgo = Date.now() - 9 * 24 * 60 * 60 * 1000
    const db = await this.fetchBackend<any>('/fixtures/finished?limit=100')
    const rows: any[] = Array.isArray(db) ? db : (db?.data ?? [])
    return rows
      .map(convertDbFixture)
      .filter((f) => new Date(f.matchDate).getTime() >= nineDaysAgo)
      .sort(
        (a, b) =>
          new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
      )
  }

  async getAllFixtures(): Promise<Fixture[]> {
    // Explicit date window — /matches without dates only returns today
    const now = Date.now()
    const dateFrom = new Date(now).toISOString().split('T')[0]
    const dateTo = new Date(now + 9 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const data = await this.fetchFootballData<any>(
      `/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`
    )

    // Also fetch API-Football-only leagues (e.g., TSL) in parallel
    const apiOnlyPromise = this.fetchApiFootballOnlyLeagues()

    if (data?.matches?.length) {
      const fdFixtures = data.matches.map(convertMatch)
      const apiOnlyFixtures = await apiOnlyPromise
      return [...fdFixtures, ...apiOnlyFixtures]
    }

    const today = new Date().toISOString().split('T')[0]
    const apiData = await this.fetchApiFootball<any>(`/fixtures?date=${today}`)
    if (apiData?.response) {
      return curatedApiFixtures(apiData.response)
    }

    // Fallback to backend service (database)
    const dbData = await this.fetchBackend<any>('/fixtures/upcoming')
    if (dbData) return Array.isArray(dbData) ? dbData : dbData.data || []

    return []
  }

  async getFixtureById(id: number): Promise<Fixture | null> {
    // DB-first, same as the lists: the id IS our DB identity (apiId or
    // internal id), and resolving it against external feeds means asking the
    // wrong provider's id space — that's how "maç bulunamadı" happened on
    // valid matches. The backend proxy also lazily refreshes live state.
    const dbData = await this.fetchBackend<any>(`/fixtures/${id}`)
    if (dbData) {
      // The detail route may return the raw row ({data:...} unwrapped by
      // fetchBackend) — normalize through the same converter as the lists
      // when it looks like a DB row (has homeTeam relation object).
      return dbData.homeTeam?.name !== undefined &&
        dbData.matchDate !== undefined
        ? (dbData.predictions !== undefined
            ? { ...convertDbFixture(dbData), predictions: dbData.predictions }
            : convertDbFixture(dbData))
        : (dbData as Fixture)
    }

    return null
  }

  async getFixturesByLeague(leagueCode: string): Promise<Fixture[]> {
    // Only try football-data.org for leagues in their free tier
    if (FOOTBALL_DATA_FREE_LEAGUES.has(leagueCode)) {
      const data = await this.fetchFootballData<any>(
        `/competitions/${leagueCode}/matches?status=SCHEDULED,IN_PLAY`
      )
      if (data?.matches) {
        return data.matches.map(convertMatch)
      }
    }

    // Fallback (or primary for non-free leagues like TSL) to API-Football
    if (API_FOOTBALL_LEAGUES[leagueCode]) {
      const apiData = await this.fetchApiFootball<any>(
        `/fixtures?league=${API_FOOTBALL_LEAGUES[leagueCode]}&next=10`
      )
      if (apiData?.response) {
        return curatedApiFixtures(apiData.response)
      }
    }

    // DB fallback for leagues like TSL when API keys are unavailable
    const leagueId = API_FOOTBALL_LEAGUES[leagueCode]
    if (leagueId) {
      const dbData = await this.fetchBackend<any>(
        `/fixtures/league/${leagueId}`
      )
      if (dbData && Array.isArray(dbData) && dbData.length > 0) return dbData
    }

    return []
  }

  async getStandings(leagueCode: string): Promise<Standing[]> {
    // Only try football-data.org for leagues in their free tier
    if (FOOTBALL_DATA_FREE_LEAGUES.has(leagueCode)) {
      const data = await this.fetchFootballData<any>(
        `/competitions/${leagueCode}/standings`
      )
      // Leagues have a single TOTAL table; tournaments (World Cup, Euro)
      // return one TOTAL table per group — flatten them with group labels.
      const tables = (data?.standings ?? []).filter(
        (t: any) => t.type === 'TOTAL' && t.table?.length
      )
      if (tables.length > 0) {
        return tables.flatMap((t: any) =>
          t.table.map((s: any) => ({
            group: formatGroupLabel(t.group),
            position: s.position,
            team: {
              id: s.team?.id,
              name: s.team?.name,
              code: s.team?.tla,
              logoUrl: s.team?.crest,
            },
            played: s.playedGames,
            won: s.won,
            drawn: s.draw,
            lost: s.lost,
            goalsFor: s.goalsFor,
            goalsAgainst: s.goalsAgainst,
            goalDifference: s.goalDifference,
            points: s.points,
            form: s.form?.split(',').map((r: string) => r.charAt(0)) || [],
          }))
        )
      }
    }

    if (API_FOOTBALL_LEAGUES[leagueCode]) {
      // Football seasons span two years (e.g. 2025-2026); API-Football uses
      // the starting year, so before July use the previous year. Tournaments
      // (World Cup) are played within a single calendar year instead.
      const now = new Date()
      const season =
        leagueCode === 'WC'
          ? now.getFullYear()
          : now.getMonth() < 6
            ? now.getFullYear() - 1
            : now.getFullYear()
      const apiData = await this.fetchApiFootball<any>(
        `/standings?league=${API_FOOTBALL_LEAGUES[leagueCode]}&season=${season}`
      )
      // standings is an array of tables: one for leagues, one per group for
      // tournaments — flatten with group labels.
      const groups: any[][] = apiData?.response?.[0]?.league?.standings ?? []
      if (groups.length > 0) {
        return groups.flatMap((table) =>
          (table ?? []).map((s: any) => ({
            group: groups.length > 1 ? formatGroupLabel(s.group) : undefined,
            position: s.rank,
            team: {
              id: s.team?.id,
              name: s.team?.name,
              logoUrl: s.team?.logo,
            },
            played: s.all?.played || 0,
            won: s.all?.win || 0,
            drawn: s.all?.draw || 0,
            lost: s.all?.lose || 0,
            goalsFor: s.all?.goals?.for || 0,
            goalsAgainst: s.all?.goals?.against || 0,
            goalDifference: s.goalsDiff || 0,
            points: s.points || 0,
            form: s.form?.split('').slice(-5) || [],
          }))
        )
      }
    }

    // Fallback to backend service (database)
    const leagueId = API_FOOTBALL_LEAGUES[leagueCode]
    if (leagueId) {
      const dbData = await this.fetchBackend<Standing[]>(
        `/stats/leagues/${leagueId}/standings`
      )
      if (dbData && Array.isArray(dbData) && dbData.length > 0) return dbData
    }

    return []
  }

  async getLeagues(): Promise<League[]> {
    const data = await this.fetchFootballData<any>('/competitions')
    if (data?.competitions) {
      return data.competitions
        .filter((c: any) => c.plan === 'TIER_ONE')
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          country: c.area?.name || '',
          logoUrl: c.emblem,
          countryCode: c.area?.code,
        }))
    }

    return Object.values(LEAGUES)
  }

  async getStats(): Promise<{
    totalFixtures: number
    liveMatches: number
    totalPredictions: number
    modelAccuracy: number
  }> {
    try {
      return await this.fetchService('/api/stats')
    } catch {
      return {
        totalFixtures: 0,
        liveMatches: 0,
        totalPredictions: 0,
        modelAccuracy: 0,
      }
    }
  }

  async syncFixtures(
    date?: string,
    leagueId?: number
  ): Promise<{ synced: number }> {
    const params = new URLSearchParams()
    if (date) params.append('date', date)
    if (leagueId) params.append('leagueId', leagueId.toString())

    try {
      return await this.fetchService(`/api/fixtures/sync?${params}`, {
        method: 'POST',
      })
    } catch {
      return { synced: 0 }
    }
  }
}

export const api = new ApiClient(API_URL)

// Re-export reference data
export { LEAGUES, getAllLeagues, COUNTRY_FLAGS } from './reference-data'
export type { Standing } from './reference-data'
