import axios, { AxiosInstance } from 'axios'
import { config } from '../config'

/**
 * Football-Data.org API Client
 * Free tier: 10 requests/minute, covers top 12 leagues
 * Docs: https://www.football-data.org/documentation/quickstart
 */
class FootballDataClient {
  private client: AxiosInstance
  private requestCount = 0
  private lastRequestTime = Date.now()
  private readonly rateLimit = 10 // requests per minute

  constructor() {
    this.client = axios.create({
      baseURL: config.footballData.baseUrl,
      timeout: config.footballData.timeout,
      headers: {
        'X-Auth-Token': config.footballData.key,
      },
    })

    // Request interceptor for rate limiting (10 req/min)
    this.client.interceptors.request.use(async (requestConfig) => {
      const now = Date.now()
      const timeSinceLastReset = now - this.lastRequestTime

      // Reset counter every minute
      if (timeSinceLastReset >= 60000) {
        this.requestCount = 0
        this.lastRequestTime = now
      }

      this.requestCount++
      console.log(`📡 Football-Data.org request #${this.requestCount}/${this.rateLimit} per minute`)

      // If we hit the rate limit, wait until the minute resets
      if (this.requestCount > this.rateLimit) {
        const waitTime = 60000 - timeSinceLastReset
        console.log(`⏳ Rate limit reached, waiting ${waitTime}ms`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        this.requestCount = 1
        this.lastRequestTime = Date.now()
      }

      return requestConfig
    })
  }

  // Competition IDs for free tier
  static readonly COMPETITIONS = {
    PREMIER_LEAGUE: 'PL',
    LA_LIGA: 'PD',
    BUNDESLIGA: 'BL1',
    SERIE_A: 'SA',
    LIGUE_1: 'FL1',
    EREDIVISIE: 'DED',
    PRIMEIRA_LIGA: 'PPL',
    CHAMPIONS_LEAGUE: 'CL',
    EUROPA_LEAGUE: 'EL',
    WORLD_CUP: 'WC',
    EURO: 'EC',
    CHAMPIONSHIP: 'ELC',
  } as const

  // Get all available competitions
  async getCompetitions() {
    const response = await this.client.get('/competitions')
    return response.data
  }

  // Get competition by code (e.g., 'PL' for Premier League)
  async getCompetition(code: string) {
    const response = await this.client.get(`/competitions/${code}`)
    return response.data
  }

  // Get matches for a competition
  async getMatches(params: {
    competitions?: string // comma-separated competition codes
    dateFrom?: string // YYYY-MM-DD
    dateTo?: string // YYYY-MM-DD
    status?: 'SCHEDULED' | 'LIVE' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED'
  }) {
    const response = await this.client.get('/matches', { params })
    return response.data
  }

  // Get matches for a specific competition
  async getCompetitionMatches(
    competitionCode: string,
    params?: {
      dateFrom?: string
      dateTo?: string
      stage?: string
      status?: string
      matchday?: number
      season?: number
    }
  ) {
    const response = await this.client.get(`/competitions/${competitionCode}/matches`, { params })
    return response.data
  }

  // Get standings for a competition
  async getStandings(competitionCode: string, params?: { season?: number }) {
    const response = await this.client.get(`/competitions/${competitionCode}/standings`, { params })
    return response.data
  }

  // Get team by ID
  async getTeam(teamId: number) {
    const response = await this.client.get(`/teams/${teamId}`)
    return response.data
  }

  // Get team matches
  async getTeamMatches(
    teamId: number,
    params?: {
      dateFrom?: string
      dateTo?: string
      status?: string
      competitions?: string
      limit?: number
    }
  ) {
    const response = await this.client.get(`/teams/${teamId}/matches`, { params })
    return response.data
  }

  // Get match by ID
  async getMatch(matchId: number) {
    const response = await this.client.get(`/matches/${matchId}`)
    return response.data
  }

  // Get scorers for a competition
  async getScorers(competitionCode: string, params?: { season?: number; limit?: number }) {
    const response = await this.client.get(`/competitions/${competitionCode}/scorers`, { params })
    return response.data
  }

  // Get teams in a competition
  async getCompetitionTeams(competitionCode: string, params?: { season?: number }) {
    const response = await this.client.get(`/competitions/${competitionCode}/teams`, { params })
    return response.data
  }

  // Get head to head between two teams
  async getHeadToHead(
    matchId: number,
    params?: {
      limit?: number
      dateFrom?: string
      dateTo?: string
    }
  ) {
    const response = await this.client.get(`/matches/${matchId}/head2head`, { params })
    return response.data
  }

  // Helper: Get today's matches
  async getTodayMatches(competitionCode?: string) {
    const today = new Date().toISOString().split('T')[0]
    if (competitionCode) {
      return this.getCompetitionMatches(competitionCode, {
        dateFrom: today,
        dateTo: today,
      })
    }
    return this.getMatches({
      dateFrom: today,
      dateTo: today,
    })
  }

  // Helper: Get live matches
  async getLiveMatches() {
    return this.getMatches({ status: 'LIVE' })
  }
}

export const footballDataClient = new FootballDataClient()
