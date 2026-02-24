import {
  LEAGUES,
  type Standing,
} from './reference-data'

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
  status: 'SCHEDULED' | 'LIVE' | 'HALFTIME' | 'FINISHED' | 'POSTPONED' | 'CANCELLED'
  homeScore?: number
  awayScore?: number
  minute?: number
  predictions?: Prediction[]
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

// Football-Data.org status mapping
const STATUS_MAP: Record<string, Fixture['status']> = {
  'SCHEDULED': 'SCHEDULED',
  'TIMED': 'SCHEDULED',
  'IN_PLAY': 'LIVE',
  'PAUSED': 'HALFTIME',
  'FINISHED': 'FINISHED',
  'POSTPONED': 'POSTPONED',
  'CANCELLED': 'CANCELLED',
  'SUSPENDED': 'POSTPONED',
}

function convertMatch(match: any): Fixture {
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
    minute: match.minute,
  }
}

function convertApiFootballMatch(match: any): Fixture {
  const statusMap: Record<string, Fixture['status']> = {
    'NS': 'SCHEDULED', 'TBD': 'SCHEDULED',
    '1H': 'LIVE', '2H': 'LIVE',
    'HT': 'HALFTIME',
    'FT': 'FINISHED', 'AET': 'FINISHED', 'PEN': 'FINISHED',
    'PST': 'POSTPONED', 'CANC': 'CANCELLED',
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
      const res = await fetch(`${PROXY_URL}?endpoint=${encodeURIComponent(endpoint)}&source=football-data`, {
        next: { revalidate: 60 },
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        if (res.status === 429 || errorData.rateLimited) {
          console.warn('Football-Data.org rate limit exceeded, trying fallback...')
          return null
        }
        if (res.status === 500 && errorData.error === 'API key not configured') {
          throw new ApiConfigError()
        }
        return null
      }

      return await res.json()
    } catch (e) {
      if (e instanceof ApiConfigError) throw e
      return null
    }
  }

  /** Fetch from API-Football via Next.js proxy (fallback) */
  private async fetchApiFootball<T>(endpoint: string): Promise<T | null> {
    try {
      const res = await fetch(`${PROXY_URL}?endpoint=${encodeURIComponent(endpoint)}&source=api-football`, {
        next: { revalidate: 60 },
      })

      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }

  /** Direct fetch to backend service */
  private async fetchService<T>(endpoint: string, options?: RequestInit): Promise<T> {
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

  async getUpcomingFixtures(): Promise<Fixture[]> {
    // Try Football-Data.org first
    const data = await this.fetchFootballData<any>('/matches?status=SCHEDULED,TIMED')
    if (data?.matches) {
      return data.matches.map(convertMatch)
    }

    // Fallback to API-Football
    const today = new Date().toISOString().split('T')[0]
    const apiData = await this.fetchApiFootball<any>(`/fixtures?date=${today}&status=NS-TBD`)
    if (apiData?.response) {
      return apiData.response.map(convertApiFootballMatch)
    }

    return []
  }

  async getLiveFixtures(): Promise<Fixture[]> {
    const data = await this.fetchFootballData<any>('/matches?status=IN_PLAY,PAUSED')
    if (data?.matches) {
      return data.matches.map(convertMatch)
    }

    const apiData = await this.fetchApiFootball<any>('/fixtures?live=all')
    if (apiData?.response) {
      return apiData.response.map(convertApiFootballMatch)
    }

    return []
  }

  async getFinishedFixtures(): Promise<Fixture[]> {
    const today = new Date().toISOString().split('T')[0]

    const data = await this.fetchFootballData<any>(`/matches?status=FINISHED&dateFrom=${today}&dateTo=${today}`)
    if (data?.matches) {
      return data.matches.map(convertMatch)
    }

    const apiData = await this.fetchApiFootball<any>(`/fixtures?date=${today}&status=FT-AET-PEN`)
    if (apiData?.response) {
      return apiData.response.map(convertApiFootballMatch)
    }

    return []
  }

  async getAllFixtures(): Promise<Fixture[]> {
    const data = await this.fetchFootballData<any>('/matches')
    if (data?.matches) {
      return data.matches.map(convertMatch)
    }

    const today = new Date().toISOString().split('T')[0]
    const apiData = await this.fetchApiFootball<any>(`/fixtures?date=${today}`)
    if (apiData?.response) {
      return apiData.response.map(convertApiFootballMatch)
    }

    return []
  }

  async getFixtureById(id: number): Promise<Fixture | null> {
    const data = await this.fetchFootballData<any>(`/matches/${id}`)
    if (data) {
      return convertMatch(data)
    }

    return null
  }

  async getFixturesByLeague(leagueCode: string): Promise<Fixture[]> {
    const apiFootballLeagues: Record<string, number> = {
      'PL': 39, 'PD': 140, 'BL1': 78, 'SA': 135, 'FL1': 61, 'TSL': 203
    }

    const data = await this.fetchFootballData<any>(`/competitions/${leagueCode}/matches?status=SCHEDULED,IN_PLAY`)
    if (data?.matches) {
      return data.matches.map(convertMatch)
    }

    if (apiFootballLeagues[leagueCode]) {
      const apiData = await this.fetchApiFootball<any>(`/fixtures?league=${apiFootballLeagues[leagueCode]}&next=10`)
      if (apiData?.response) {
        return apiData.response.map(convertApiFootballMatch)
      }
    }

    return []
  }

  async getStandings(leagueCode: string): Promise<Standing[]> {
    const apiFootballLeagues: Record<string, number> = {
      'PL': 39, 'PD': 140, 'BL1': 78, 'SA': 135, 'FL1': 61, 'TSL': 203
    }

    const data = await this.fetchFootballData<any>(`/competitions/${leagueCode}/standings`)
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

    if (apiFootballLeagues[leagueCode]) {
      const season = new Date().getFullYear()
      const apiData = await this.fetchApiFootball<any>(`/standings?league=${apiFootballLeagues[leagueCode]}&season=${season}`)
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

  async syncFixtures(date?: string, leagueId?: number): Promise<{ synced: number }> {
    const params = new URLSearchParams()
    if (date) params.append('date', date)
    if (leagueId) params.append('leagueId', leagueId.toString())

    try {
      return await this.fetchService(`/api/fixtures/sync?${params}`, { method: 'POST' })
    } catch {
      return { synced: 0 }
    }
  }
}

export const api = new ApiClient(API_URL)

// Re-export reference data
export { LEAGUES, getAllLeagues, COUNTRY_FLAGS } from './reference-data'
export type { Standing } from './reference-data'
