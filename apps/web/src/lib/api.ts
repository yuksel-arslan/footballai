const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
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
  }

  async getUpcomingFixtures(): Promise<Fixture[]> {
    return this.fetch<Fixture[]>('/api/fixtures/upcoming')
  }

  async getLiveFixtures(): Promise<Fixture[]> {
    return this.fetch<Fixture[]>('/api/fixtures/live')
  }

  async getFixtureById(id: number): Promise<Fixture> {
    return this.fetch<Fixture>(`/api/fixtures/${id}`)
  }

  async syncFixtures(date?: string, leagueId?: number): Promise<{ synced: number }> {
    const params = new URLSearchParams()
    if (date) params.append('date', date)
    if (leagueId) params.append('leagueId', leagueId.toString())

    return this.fetch<{ synced: number }>(`/api/fixtures/sync?${params}`, {
      method: 'POST',
    })
  }

  async getStats(): Promise<{
    totalFixtures: number
    liveMatches: number
    totalPredictions: number
    modelAccuracy: number
  }> {
    return this.fetch('/api/stats')
  }
}

export const api = new ApiClient(API_URL)
