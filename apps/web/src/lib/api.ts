import {
  MOCK_FIXTURES,
  MOCK_STATS,
  MOCK_STANDINGS,
  getFixturesByStatus,
  getAllLeagues,
  LEAGUES,
  type Standing,
} from './mock-data'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false' // Default to mock unless explicitly 'false'
const FOOTBALL_DATA_URL = 'https://api.football-data.org/v4'
const FOOTBALL_DATA_KEY = process.env.NEXT_PUBLIC_FOOTBALL_DATA_KEY || ''

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

// Convert Football-Data.org match to our Fixture format
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
    predictions: generateMockPrediction(),
  }
}

// Generate mock prediction (AI model will replace this)
function generateMockPrediction(): Prediction[] {
  const homeWin = Math.random() * 0.5 + 0.2
  const draw = Math.random() * 0.3 + 0.1
  const awayWin = 1 - homeWin - draw

  return [{
    homeWinProb: homeWin,
    drawProb: draw,
    awayWinProb: Math.max(0.1, awayWin),
    predictedHomeScore: Math.floor(Math.random() * 3),
    predictedAwayScore: Math.floor(Math.random() * 3),
    confidence: Math.random() * 0.3 + 0.6,
  }]
}

class ApiClient {
  private baseUrl: string
  private useMock: boolean

  constructor(baseUrl: string, useMock: boolean = true) {
    this.baseUrl = baseUrl
    this.useMock = useMock
  }

  // Fetch from Football-Data.org directly
  private async fetchFootballData<T>(endpoint: string): Promise<T | null> {
    if (!FOOTBALL_DATA_KEY) {
      console.warn('Football-Data.org API key not configured')
      return null
    }

    try {
      const res = await fetch(`${FOOTBALL_DATA_URL}${endpoint}`, {
        headers: {
          'X-Auth-Token': FOOTBALL_DATA_KEY,
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      })

      if (!res.ok) {
        if (res.status === 429) {
          console.warn('Football-Data.org rate limit exceeded')
        }
        throw new Error(`Football-Data API Error: ${res.status}`)
      }

      return await res.json()
    } catch (error) {
      console.error('Football-Data.org fetch error:', error)
      return null
    }
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })

      if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`)
      }

      const json = await res.json()
      return json.data || json
    } catch (error) {
      console.warn(`API unavailable: ${error}`)
      throw error
    }
  }

  async getUpcomingFixtures(): Promise<Fixture[]> {
    // Try Football-Data.org first if not using mock
    if (!this.useMock && FOOTBALL_DATA_KEY) {
      const data = await this.fetchFootballData<any>('/matches?status=SCHEDULED,TIMED')
      if (data?.matches) {
        return data.matches.map(convertMatch)
      }
    }

    // Fallback to mock
    return getFixturesByStatus('SCHEDULED')
  }

  async getLiveFixtures(): Promise<Fixture[]> {
    if (!this.useMock && FOOTBALL_DATA_KEY) {
      const data = await this.fetchFootballData<any>('/matches?status=IN_PLAY,PAUSED')
      if (data?.matches) {
        return data.matches.map(convertMatch)
      }
    }

    return getFixturesByStatus('LIVE')
  }

  async getFinishedFixtures(): Promise<Fixture[]> {
    if (!this.useMock && FOOTBALL_DATA_KEY) {
      const today = new Date().toISOString().split('T')[0]
      const data = await this.fetchFootballData<any>(`/matches?status=FINISHED&dateFrom=${today}&dateTo=${today}`)
      if (data?.matches) {
        return data.matches.map(convertMatch)
      }
    }

    return getFixturesByStatus('FINISHED')
  }

  async getAllFixtures(): Promise<Fixture[]> {
    if (!this.useMock && FOOTBALL_DATA_KEY) {
      const data = await this.fetchFootballData<any>('/matches')
      if (data?.matches) {
        return data.matches.map(convertMatch)
      }
    }

    return MOCK_FIXTURES
  }

  async getFixtureById(id: number): Promise<Fixture | null> {
    if (!this.useMock && FOOTBALL_DATA_KEY) {
      const data = await this.fetchFootballData<any>(`/matches/${id}`)
      if (data) {
        return convertMatch(data)
      }
    }

    return MOCK_FIXTURES.find(f => f.id === id) || null
  }

  async getFixturesByLeague(leagueCode: string): Promise<Fixture[]> {
    if (!this.useMock && FOOTBALL_DATA_KEY) {
      const data = await this.fetchFootballData<any>(`/competitions/${leagueCode}/matches?status=SCHEDULED,IN_PLAY`)
      if (data?.matches) {
        return data.matches.map(convertMatch)
      }
    }

    const league = LEAGUES[leagueCode]
    if (!league) return []
    return MOCK_FIXTURES.filter(f => f.league.id === league.id)
  }

  async getStandings(leagueCode: string): Promise<Standing[]> {
    if (!this.useMock && FOOTBALL_DATA_KEY) {
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
    }

    return MOCK_STANDINGS[leagueCode] || []
  }

  async getLeagues(): Promise<League[]> {
    if (!this.useMock && FOOTBALL_DATA_KEY) {
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
    }

    return getAllLeagues()
  }

  async syncFixtures(date?: string, leagueId?: number): Promise<{ synced: number }> {
    const params = new URLSearchParams()
    if (date) params.append('date', date)
    if (leagueId) params.append('leagueId', leagueId.toString())

    try {
      return await this.fetch<{ synced: number }>(`/api/fixtures/sync?${params}`, {
        method: 'POST',
      })
    } catch {
      return { synced: 0 }
    }
  }

  async getStats(): Promise<{
    totalFixtures: number
    liveMatches: number
    totalPredictions: number
    modelAccuracy: number
  }> {
    if (this.useMock) {
      return MOCK_STATS
    }

    try {
      return await this.fetch('/api/stats')
    } catch {
      return MOCK_STATS
    }
  }
}

export const api = new ApiClient(API_URL, USE_MOCK)

// Re-export types and data
export { LEAGUES, MOCK_STANDINGS, getAllLeagues, COUNTRY_FLAGS } from './mock-data'
export type { Standing } from './mock-data'
