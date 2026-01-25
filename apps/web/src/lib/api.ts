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
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true' || true // Default to mock for demo

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

class ApiClient {
  private baseUrl: string
  private useMock: boolean

  constructor(baseUrl: string, useMock: boolean = true) {
    this.baseUrl = baseUrl
    this.useMock = useMock
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
      console.warn(`API unavailable, using mock data: ${error}`)
      throw error
    }
  }

  async getUpcomingFixtures(): Promise<Fixture[]> {
    if (this.useMock) {
      return getFixturesByStatus('SCHEDULED')
    }

    try {
      return await this.fetch<Fixture[]>('/api/fixtures/upcoming')
    } catch {
      return getFixturesByStatus('SCHEDULED')
    }
  }

  async getLiveFixtures(): Promise<Fixture[]> {
    if (this.useMock) {
      return getFixturesByStatus('LIVE')
    }

    try {
      return await this.fetch<Fixture[]>('/api/fixtures/live')
    } catch {
      return getFixturesByStatus('LIVE')
    }
  }

  async getFinishedFixtures(): Promise<Fixture[]> {
    if (this.useMock) {
      return getFixturesByStatus('FINISHED')
    }

    try {
      return await this.fetch<Fixture[]>('/api/fixtures/finished')
    } catch {
      return getFixturesByStatus('FINISHED')
    }
  }

  async getAllFixtures(): Promise<Fixture[]> {
    if (this.useMock) {
      return MOCK_FIXTURES
    }

    try {
      return await this.fetch<Fixture[]>('/api/fixtures')
    } catch {
      return MOCK_FIXTURES
    }
  }

  async getFixtureById(id: number): Promise<Fixture | null> {
    if (this.useMock) {
      return MOCK_FIXTURES.find(f => f.id === id) || null
    }

    try {
      return await this.fetch<Fixture>(`/api/fixtures/${id}`)
    } catch {
      return MOCK_FIXTURES.find(f => f.id === id) || null
    }
  }

  async getFixturesByLeague(leagueCode: string): Promise<Fixture[]> {
    if (this.useMock) {
      const league = LEAGUES[leagueCode]
      if (!league) return []
      return MOCK_FIXTURES.filter(f => f.league.id === league.id)
    }

    try {
      return await this.fetch<Fixture[]>(`/api/fixtures?league=${leagueCode}`)
    } catch {
      const league = LEAGUES[leagueCode]
      if (!league) return []
      return MOCK_FIXTURES.filter(f => f.league.id === league.id)
    }
  }

  async getStandings(leagueCode: string): Promise<Standing[]> {
    if (this.useMock) {
      return MOCK_STANDINGS[leagueCode] || []
    }

    try {
      return await this.fetch<Standing[]>(`/api/standings/${leagueCode}`)
    } catch {
      return MOCK_STANDINGS[leagueCode] || []
    }
  }

  async getLeagues(): Promise<League[]> {
    if (this.useMock) {
      return getAllLeagues()
    }

    try {
      return await this.fetch<League[]>('/api/leagues')
    } catch {
      return getAllLeagues()
    }
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
