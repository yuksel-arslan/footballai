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
}

// Leagues only available via API-Football (not in Football-Data.org free tier)
const API_FOOTBALL_ONLY_LEAGUES = Object.entries(API_FOOTBALL_LEAGUES)
  .filter(([code]) => !FOOTBALL_DATA_FREE_LEAGUES.has(code))
  .map(([, id]) => id)

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
        return apiData.response.map(convertApiFootballMatch)
      }
      return []
    })

    const allResults = await Promise.all(fetches)
    for (const r of allResults) results.push(...r)
    return results
  }

  async getUpcomingFixtures(): Promise<Fixture[]> {
    // Try Football-Data.org first
    const data = await this.fetchFootballData<any>(
      '/matches?status=SCHEDULED,TIMED'
    )

    // Also fetch API-Football-only leagues (e.g., TSL) in parallel
    const apiOnlyPromise = this.fetchApiFootballOnlyLeagues('status=NS-TBD')

    if (data?.matches) {
      const fdFixtures = data.matches.map(convertMatch)
      const apiOnlyFixtures = await apiOnlyPromise
      return [...fdFixtures, ...apiOnlyFixtures]
    }

    // Fallback to API-Football for all leagues
    const today = new Date().toISOString().split('T')[0]
    const apiData = await this.fetchApiFootball<any>(
      `/fixtures?date=${today}&status=NS-TBD`
    )
    if (apiData?.response) {
      return apiData.response.map(convertApiFootballMatch)
    }

    // Fallback to backend service (database)
    const dbData = await this.fetchBackend<any>('/fixtures/upcoming')
    if (dbData) return Array.isArray(dbData) ? dbData : dbData.data || []

    return []
  }

  async getLiveFixtures(): Promise<Fixture[]> {
    const data = await this.fetchFootballData<any>(
      '/matches?status=IN_PLAY,PAUSED'
    )

    // Fetch API-Football live data in parallel (for minute enrichment + extra leagues)
    const apiOnlyPromise = this.fetchApiFootballOnlyLeagues('live=all')
    const apiLivePromise = this.fetchApiFootball<any>(
      '/fixtures?live=all'
    ).catch(() => null)

    if (data?.matches) {
      let fdFixtures: Fixture[] = data.matches.map(convertMatch)

      // Enrich Football-Data.org fixtures with exact minute from API-Football
      const apiLiveData = await apiLivePromise
      if (apiLiveData?.response?.length) {
        const minuteMap = new Map<string, number>()
        for (const m of apiLiveData.response) {
          const name =
            `${m.teams?.home?.name}-${m.teams?.away?.name}`.toLowerCase()
          if (m.fixture?.status?.elapsed) {
            minuteMap.set(name, m.fixture.status.elapsed)
          }
        }
        fdFixtures = fdFixtures.map((f) => {
          if (f.status === 'LIVE' || f.status === 'HALFTIME') {
            const key = `${f.homeTeam.name}-${f.awayTeam.name}`.toLowerCase()
            const exactMinute = minuteMap.get(key)
            if (exactMinute) return { ...f, minute: exactMinute }
          }
          return f
        })
      }

      const apiOnlyFixtures = await apiOnlyPromise
      return [...fdFixtures, ...apiOnlyFixtures]
    }

    const apiData = await apiLivePromise
    if (apiData?.response) {
      return apiData.response.map(convertApiFootballMatch)
    }

    // Fallback to backend service (database)
    const dbData = await this.fetchBackend<any>('/fixtures/live')
    if (dbData) return Array.isArray(dbData) ? dbData : dbData.data || []

    return []
  }

  async getFinishedFixtures(): Promise<Fixture[]> {
    // Use a date window that's wide enough to capture the last 5 finished
    // matchdays.  Football-Data.org requires date params; 14 days is a safe
    // window that covers international breaks / off-weeks while still
    // returning a manageable amount of data.
    const today = new Date()
    const dateTo = today.toISOString().split('T')[0]
    const dateFrom = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const data = await this.fetchFootballData<any>(
      `/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}`
    )

    // Also fetch API-Football-only leagues (e.g., TSL) – use last=5 per league
    const apiOnlyPromise = this.fetchApiFootballOnlyLeagues(
      `last=5&status=FT-AET-PEN`
    )

    if (data?.matches) {
      const fdFixtures = data.matches.map(convertMatch)
      const apiOnlyFixtures = await apiOnlyPromise
      // Sort by date descending (most recent first)
      return [...fdFixtures, ...apiOnlyFixtures].sort(
        (a, b) =>
          new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
      )
    }

    // Fallback to API-Football for all leagues – fetch last 5 finished per league
    const allFinished: Fixture[] = []
    const apiOnlyFixtures = await apiOnlyPromise
    allFinished.push(...apiOnlyFixtures)

    // Fetch last 5 finished matches across all tracked leagues
    for (const [, leagueId] of Object.entries(API_FOOTBALL_LEAGUES)) {
      const now = new Date()
      const season =
        now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear()
      const apiData = await this.fetchApiFootball<any>(
        `/fixtures?league=${leagueId}&season=${season}&last=5&status=FT-AET-PEN`
      )
      if (apiData?.response) {
        allFinished.push(...apiData.response.map(convertApiFootballMatch))
      }
    }

    if (allFinished.length > 0) {
      return allFinished.sort(
        (a, b) =>
          new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
      )
    }

    // Fallback to backend service (database)
    const dbData = await this.fetchBackend<any>('/fixtures/finished')
    if (dbData) return Array.isArray(dbData) ? dbData : dbData.data || []

    return []
  }

  async getAllFixtures(): Promise<Fixture[]> {
    const data = await this.fetchFootballData<any>('/matches')

    // Also fetch API-Football-only leagues (e.g., TSL) in parallel
    const apiOnlyPromise = this.fetchApiFootballOnlyLeagues()

    if (data?.matches) {
      const fdFixtures = data.matches.map(convertMatch)
      const apiOnlyFixtures = await apiOnlyPromise
      return [...fdFixtures, ...apiOnlyFixtures]
    }

    const today = new Date().toISOString().split('T')[0]
    const apiData = await this.fetchApiFootball<any>(`/fixtures?date=${today}`)
    if (apiData?.response) {
      return apiData.response.map(convertApiFootballMatch)
    }

    // Fallback to backend service (database)
    const dbData = await this.fetchBackend<any>('/fixtures/upcoming')
    if (dbData) return Array.isArray(dbData) ? dbData : dbData.data || []

    return []
  }

  async getFixtureById(id: number): Promise<Fixture | null> {
    const data = await this.fetchFootballData<any>(`/matches/${id}`)
    if (data) {
      const fixture = convertMatch(data)

      // For live matches, try to get exact minute from API-Football
      if (
        (fixture.status === 'LIVE' || fixture.status === 'HALFTIME') &&
        !data.minute
      ) {
        try {
          const apiData = await this.fetchApiFootball<any>(`/fixtures?id=${id}`)
          const apiMatch = apiData?.response?.[0]
          if (apiMatch?.fixture?.status?.elapsed) {
            fixture.minute = apiMatch.fixture.status.elapsed
          }
        } catch {
          // keep estimated minute from convertMatch
        }
      }

      return fixture
    }

    // Try API-Football by fixture ID
    try {
      const apiData = await this.fetchApiFootball<any>(`/fixtures?id=${id}`)
      if (apiData?.response?.[0]) {
        return convertApiFootballMatch(apiData.response[0])
      }
    } catch {
      // fall through
    }

    // Fallback to backend service (database)
    const dbData = await this.fetchBackend<Fixture>(`/fixtures/${id}`)
    if (dbData) return dbData

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
        return apiData.response.map(convertApiFootballMatch)
      }
    }

    return []
  }

  async getStandings(leagueCode: string): Promise<Standing[]> {
    // Only try football-data.org for leagues in their free tier
    if (FOOTBALL_DATA_FREE_LEAGUES.has(leagueCode)) {
      const data = await this.fetchFootballData<any>(
        `/competitions/${leagueCode}/standings`
      )
      if (data?.standings?.[0]?.table) {
        return data.standings[0].table.map((s: any) => ({
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
      }
    }

    if (API_FOOTBALL_LEAGUES[leagueCode]) {
      // Football seasons span two years (e.g. 2025-2026).
      // API-Football uses the starting year, so before July use previous year.
      const now = new Date()
      const season =
        now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear()
      const apiData = await this.fetchApiFootball<any>(
        `/standings?league=${API_FOOTBALL_LEAGUES[leagueCode]}&season=${season}`
      )
      if (apiData?.response?.[0]?.league?.standings?.[0]) {
        return apiData.response[0].league.standings[0].map((s: any) => ({
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
