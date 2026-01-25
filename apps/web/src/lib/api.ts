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
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true' // Default to real data when API key exists

// Football-Data.org (Primary) - 10 req/min, 12 competitions free
// Register: https://www.football-data.org/client/register
const FOOTBALL_DATA_URL = 'https://api.football-data.org/v4'
const FOOTBALL_DATA_KEY = process.env.NEXT_PUBLIC_FOOTBALL_DATA_KEY || ''

// API-Football (Secondary) - 100 req/day, all competitions
// Register: https://www.api-football.com/
const API_FOOTBALL_URL = 'https://v3.football.api-sports.io'
const API_FOOTBALL_KEY = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY || ''

// Check if any API key is available
const HAS_API_KEY = !!(FOOTBALL_DATA_KEY || API_FOOTBALL_KEY)

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
    this.useMock = useMock || !HAS_API_KEY
  }

  // Fetch from Football-Data.org (Primary)
  private async fetchFootballData<T>(endpoint: string): Promise<T | null> {
    if (!FOOTBALL_DATA_KEY) {
      return null
    }

    try {
      const res = await fetch(`${FOOTBALL_DATA_URL}${endpoint}`, {
        headers: {
          'X-Auth-Token': FOOTBALL_DATA_KEY,
        },
        next: { revalidate: 60 },
      })

      if (!res.ok) {
        if (res.status === 429) {
          console.warn('Football-Data.org rate limit exceeded, trying fallback...')
          return null
        }
        throw new Error(`Football-Data API Error: ${res.status}`)
      }

      return await res.json()
    } catch (error) {
      console.error('Football-Data.org fetch error:', error)
      return null
    }
  }

  // Fetch from API-Football (Secondary/Fallback)
  private async fetchApiFootball<T>(endpoint: string): Promise<T | null> {
    if (!API_FOOTBALL_KEY) {
      return null
    }

    try {
      const res = await fetch(`${API_FOOTBALL_URL}${endpoint}`, {
        headers: {
          'x-apisports-key': API_FOOTBALL_KEY,
        },
        next: { revalidate: 60 },
      })

      if (!res.ok) {
        if (res.status === 429) {
          console.warn('API-Football rate limit exceeded')
        }
        throw new Error(`API-Football Error: ${res.status}`)
      }

      return await res.json()
    } catch (error) {
      console.error('API-Football fetch error:', error)
      return null
    }
  }

  // Convert API-Football match to our Fixture format
  private convertApiFootballMatch(match: any): Fixture {
    const statusMap: Record<string, Fixture['status']> = {
      'NS': 'SCHEDULED',
      'TBD': 'SCHEDULED',
      '1H': 'LIVE',
      '2H': 'LIVE',
      'HT': 'HALFTIME',
      'FT': 'FINISHED',
      'AET': 'FINISHED',
      'PEN': 'FINISHED',
      'PST': 'POSTPONED',
      'CANC': 'CANCELLED',
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
      predictions: generateMockPrediction(),
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
    if (this.useMock) {
      return getFixturesByStatus('SCHEDULED')
    }

    // Try Football-Data.org first
    if (FOOTBALL_DATA_KEY) {
      const data = await this.fetchFootballData<any>('/matches?status=SCHEDULED,TIMED')
      if (data?.matches?.length) {
        return data.matches.map(convertMatch)
      }
    }

    // Fallback to API-Football
    if (API_FOOTBALL_KEY) {
      const today = new Date().toISOString().split('T')[0]
      const data = await this.fetchApiFootball<any>(`/fixtures?date=${today}&status=NS-TBD`)
      if (data?.response?.length) {
        return data.response.map((m: any) => this.convertApiFootballMatch(m))
      }
    }

    // Final fallback to mock
    return getFixturesByStatus('SCHEDULED')
  }

  async getLiveFixtures(): Promise<Fixture[]> {
    if (this.useMock) {
      return getFixturesByStatus('LIVE')
    }

    // Try Football-Data.org first
    if (FOOTBALL_DATA_KEY) {
      const data = await this.fetchFootballData<any>('/matches?status=IN_PLAY,PAUSED')
      if (data?.matches) {
        return data.matches.map(convertMatch)
      }
    }

    // Fallback to API-Football
    if (API_FOOTBALL_KEY) {
      const data = await this.fetchApiFootball<any>('/fixtures?live=all')
      if (data?.response?.length) {
        return data.response.map((m: any) => this.convertApiFootballMatch(m))
      }
    }

    return getFixturesByStatus('LIVE')
  }

  async getFinishedFixtures(): Promise<Fixture[]> {
    if (this.useMock) {
      return getFixturesByStatus('FINISHED')
    }

    const today = new Date().toISOString().split('T')[0]

    // Try Football-Data.org first
    if (FOOTBALL_DATA_KEY) {
      const data = await this.fetchFootballData<any>(`/matches?status=FINISHED&dateFrom=${today}&dateTo=${today}`)
      if (data?.matches?.length) {
        return data.matches.map(convertMatch)
      }
    }

    // Fallback to API-Football
    if (API_FOOTBALL_KEY) {
      const data = await this.fetchApiFootball<any>(`/fixtures?date=${today}&status=FT-AET-PEN`)
      if (data?.response?.length) {
        return data.response.map((m: any) => this.convertApiFootballMatch(m))
      }
    }

    return getFixturesByStatus('FINISHED')
  }

  async getAllFixtures(): Promise<Fixture[]> {
    if (this.useMock) {
      return MOCK_FIXTURES
    }

    // Try Football-Data.org first
    if (FOOTBALL_DATA_KEY) {
      const data = await this.fetchFootballData<any>('/matches')
      if (data?.matches?.length) {
        return data.matches.map(convertMatch)
      }
    }

    // Fallback to API-Football
    if (API_FOOTBALL_KEY) {
      const today = new Date().toISOString().split('T')[0]
      const data = await this.fetchApiFootball<any>(`/fixtures?date=${today}`)
      if (data?.response?.length) {
        return data.response.map((m: any) => this.convertApiFootballMatch(m))
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
    if (this.useMock) {
      return MOCK_STANDINGS[leagueCode] || []
    }

    // League code to API-Football league ID mapping
    const apiFootballLeagues: Record<string, number> = {
      'PL': 39, 'PD': 140, 'BL1': 78, 'SA': 135, 'FL1': 61, 'TSL': 203
    }

    // Try Football-Data.org first
    if (FOOTBALL_DATA_KEY) {
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

    // Fallback to API-Football
    if (API_FOOTBALL_KEY && apiFootballLeagues[leagueCode]) {
      const season = new Date().getFullYear()
      const data = await this.fetchApiFootball<any>(`/standings?league=${apiFootballLeagues[leagueCode]}&season=${season}`)
      if (data?.response?.[0]?.league?.standings?.[0]) {
        return data.response[0].league.standings[0].map((s: any) => ({
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
