// API Client for Football AI

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const MATCH_SERVICE_URL = process.env.NEXT_PUBLIC_MATCH_SERVICE_URL || 'http://localhost:3001'
const STATS_SERVICE_URL = process.env.NEXT_PUBLIC_STATS_SERVICE_URL || 'http://localhost:3002'
const USER_SERVICE_URL = process.env.NEXT_PUBLIC_USER_SERVICE_URL || 'http://localhost:3003'

interface ApiError {
  error: string
  details?: unknown
}

interface ApiResponse<T> {
  data: T
  pagination?: {
    limit: number
    offset: number
    total: number
  }
}

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
  }

  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: 'An unexpected error occurred',
      }))
      throw new Error(error.error)
    }

    return response.json()
  }

  // Match Service APIs
  matches = {
    getUpcoming: async (params?: {
      date?: string
      league?: number
      team?: number
      limit?: number
      offset?: number
    }) => {
      const searchParams = new URLSearchParams()
      if (params?.date) searchParams.set('date', params.date)
      if (params?.league) searchParams.set('league', params.league.toString())
      if (params?.team) searchParams.set('team', params.team.toString())
      if (params?.limit) searchParams.set('limit', params.limit.toString())
      if (params?.offset) searchParams.set('offset', params.offset.toString())

      const query = searchParams.toString()
      return this.request<ApiResponse<Match[]>>(
        `${MATCH_SERVICE_URL}/api/fixtures/upcoming${query ? `?${query}` : ''}`
      )
    },

    getLive: async () => {
      return this.request<{ data: Match[]; count: number }>(
        `${MATCH_SERVICE_URL}/api/fixtures/live`
      )
    },

    getById: async (id: number) => {
      return this.request<{ data: Match }>(
        `${MATCH_SERVICE_URL}/api/fixtures/${id}`
      )
    },
  }

  // Stats Service APIs
  stats = {
    getTeamStats: async (teamId: number, season?: number) => {
      const query = season ? `?season=${season}` : ''
      return this.request<{ data: TeamStatsResponse }>(
        `${STATS_SERVICE_URL}/api/stats/teams/${teamId}${query}`
      )
    },

    getTeamForm: async (teamId: number, last?: number) => {
      const query = last ? `?last=${last}` : ''
      return this.request<{ data: TeamFormResponse }>(
        `${STATS_SERVICE_URL}/api/stats/teams/${teamId}/form${query}`
      )
    },

    compareTeams: async (team1Id: number, team2Id: number) => {
      return this.request<{ data: CompareTeamsResponse }>(
        `${STATS_SERVICE_URL}/api/stats/compare?team1=${team1Id}&team2=${team2Id}`
      )
    },

    getH2H: async (team1Id: number, team2Id: number) => {
      return this.request<{ data: H2HResponse }>(
        `${STATS_SERVICE_URL}/api/stats/h2h/${team1Id}/${team2Id}`
      )
    },

    getStandings: async (leagueId: number, season?: number) => {
      const query = season ? `?season=${season}` : ''
      return this.request<{ data: StandingsEntry[]; count: number }>(
        `${STATS_SERVICE_URL}/api/stats/leagues/${leagueId}/standings${query}`
      )
    },
  }

  // User Service APIs
  auth = {
    register: async (data: { email: string; password: string; fullName?: string }) => {
      return this.request<AuthResponse>(`${USER_SERVICE_URL}/api/auth/register`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    login: async (data: { email: string; password: string }) => {
      return this.request<AuthResponse>(`${USER_SERVICE_URL}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    refresh: async (refreshToken: string) => {
      return this.request<{ accessToken: string; refreshToken: string }>(
        `${USER_SERVICE_URL}/api/auth/refresh`,
        {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        }
      )
    },

    me: async () => {
      return this.request<{ userId: string; email: string }>(
        `${USER_SERVICE_URL}/api/auth/me`
      )
    },
  }

  user = {
    getProfile: async () => {
      return this.request<{ data: UserProfile }>(
        `${USER_SERVICE_URL}/api/profile`
      )
    },

    updateProfile: async (data: Partial<UserProfile>) => {
      return this.request<{ data: UserProfile }>(`${USER_SERVICE_URL}/api/profile`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    },

    getFavoriteTeams: async () => {
      return this.request<{ data: FavoriteTeam[]; count: number }>(
        `${USER_SERVICE_URL}/api/favorites/teams`
      )
    },

    addFavoriteTeam: async (teamId: number) => {
      return this.request<{ message: string; teamId: number }>(
        `${USER_SERVICE_URL}/api/favorites/teams/${teamId}`,
        { method: 'POST' }
      )
    },

    removeFavoriteTeam: async (teamId: number) => {
      return this.request<{ message: string; teamId: number }>(
        `${USER_SERVICE_URL}/api/favorites/teams/${teamId}`,
        { method: 'DELETE' }
      )
    },

    getFavoriteLeagues: async () => {
      return this.request<{ data: FavoriteLeague[]; count: number }>(
        `${USER_SERVICE_URL}/api/favorites/leagues`
      )
    },

    getNotifications: async (limit?: number, unreadOnly?: boolean) => {
      const params = new URLSearchParams()
      if (limit) params.set('limit', limit.toString())
      if (unreadOnly) params.set('unread', 'true')
      const query = params.toString()
      return this.request<{
        data: { notifications: Notification[]; unreadCount: number }
      }>(`${USER_SERVICE_URL}/api/notifications${query ? `?${query}` : ''}`)
    },
  }
}

export const api = new ApiClient()

// Types
interface Match {
  id: number
  apiId: number
  matchDate: string
  status: 'SCHEDULED' | 'LIVE' | 'HALFTIME' | 'FINISHED' | 'POSTPONED' | 'CANCELLED'
  homeScore?: number
  awayScore?: number
  venue?: string
  minute?: number
  homeTeam: {
    id: number
    name: string
    logoUrl?: string
  }
  awayTeam: {
    id: number
    name: string
    logoUrl?: string
  }
  league: {
    id: number
    name: string
    logoUrl?: string
  }
  predictions?: Prediction[]
}

interface Prediction {
  id: number
  homeWinProb: number
  drawProb: number
  awayWinProb: number
  confidence: number
}

interface TeamStatsResponse {
  team: {
    id: number
    name: string
    logoUrl?: string
    country: string
  }
  season: number
  stats: {
    matchesPlayed: number
    wins: number
    draws: number
    losses: number
    goalsFor: number
    goalsAgainst: number
    goalDifference: number
    cleanSheets: number
    homeWins: number
    awayWins: number
    form: string | null
    leaguePosition: number | null
    points: number
  }
}

interface TeamFormResponse {
  teamId: number
  matches: Array<{
    fixtureId: number
    date: string
    opponent: { id: number; name: string; logoUrl?: string }
    isHome: boolean
    score: { team: number; opponent: number }
    result: 'W' | 'D' | 'L'
  }>
  summary: {
    played: number
    wins: number
    draws: number
    losses: number
    formString: string
  }
}

interface CompareTeamsResponse {
  team1: TeamStatsResponse
  team2: TeamStatsResponse
  h2h: H2HResponse
}

interface H2HResponse {
  team1: { id: number; name: string; logoUrl?: string }
  team2: { id: number; name: string; logoUrl?: string }
  stats: {
    totalMatches: number
    team1Wins: number
    team2Wins: number
    draws: number
  }
  lastMatches: Array<{
    date: string
    homeTeam: string
    awayTeam: string
    homeScore: number
    awayScore: number
  }>
}

interface StandingsEntry {
  position: number
  team: { id: number; name: string; logoUrl?: string }
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  form: string | null
}

interface AuthResponse {
  message: string
  user: {
    id: string
    email: string
    fullName?: string
    avatarUrl?: string
  }
  accessToken: string
  refreshToken: string
}

interface UserProfile {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  country?: string
  preferredLang: string
  theme: string
}

interface FavoriteTeam {
  id: number
  name: string
  logoUrl?: string
  country: string
  addedAt: string
}

interface FavoriteLeague {
  id: number
  name: string
  country: string
  logoUrl?: string
  addedAt: string
}

interface Notification {
  id: number
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export type {
  Match,
  Prediction,
  TeamStatsResponse,
  TeamFormResponse,
  H2HResponse,
  StandingsEntry,
  AuthResponse,
  UserProfile,
  FavoriteTeam,
  FavoriteLeague,
  Notification,
}
