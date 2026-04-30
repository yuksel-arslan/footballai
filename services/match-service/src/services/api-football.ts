import axios, { AxiosInstance } from 'axios'
import { config } from '../config'
import { logger } from '../lib/logger'

class ApiFootballClient {
  private client: AxiosInstance
  private requestCount = 0
  private readonly dailyLimit = config.apiFootball.rateLimitPerDay

  constructor() {
    // dashboard.api-football.com (direct) uses `x-apisports-key`.
    // rapidapi.com marketplace uses `x-rapidapi-key` + a host header on a
    // different base URL. We support BOTH: if RAPIDAPI_KEY is set, route
    // through the marketplace; otherwise use the direct endpoint with
    // API_FOOTBALL_KEY. This lets the user pick whichever account they
    // actually have a working subscription for.
    const rapidApiKey = process.env.RAPIDAPI_KEY
    const useRapidApi = !!rapidApiKey
    this.client = axios.create({
      baseURL: useRapidApi
        ? 'https://api-football-v1.p.rapidapi.com/v3'
        : config.apiFootball.baseUrl,
      timeout: config.apiFootball.timeout,
      headers: useRapidApi
        ? {
            'x-rapidapi-key': rapidApiKey,
            'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
          }
        : {
            'x-apisports-key': config.apiFootball.key,
          },
    })
    logger.info(
      { route: useRapidApi ? 'rapidapi-marketplace' : 'direct-apisports' },
      'API-Football client initialised'
    )

    // Request interceptor for rate limiting
    this.client.interceptors.request.use((config) => {
      this.requestCount++
      logger.debug(
        { count: this.requestCount, limit: this.dailyLimit },
        `API Football request #${this.requestCount}/${this.dailyLimit}`
      )

      if (this.requestCount > this.dailyLimit) {
        throw new Error('API Football daily limit exceeded')
      }

      return config
    })
  }

  // Get fixtures by date
  async getFixtures(params: {
    date?: string
    league?: number
    season?: number
    team?: number
    status?: string
  }) {
    const response = await this.client.get('/fixtures', { params })
    return response.data
  }

  // Get live fixtures
  async getLiveFixtures() {
    const response = await this.client.get('/fixtures', {
      params: { live: 'all' },
    })
    return response.data
  }

  // Get fixture by ID
  async getFixtureById(id: number) {
    const response = await this.client.get('/fixtures', {
      params: { id },
    })
    return response.data
  }

  // Get team by ID
  async getTeamById(id: number) {
    const response = await this.client.get('/teams', {
      params: { id },
    })
    return response.data
  }

  // Get team statistics
  async getTeamStatistics(params: {
    team: number
    season: number
    league: number
  }) {
    const response = await this.client.get('/teams/statistics', { params })
    return response.data
  }

  // Get leagues
  async getLeagues(params?: {
    id?: number
    country?: string
    season?: number
  }) {
    const response = await this.client.get('/leagues', { params })
    return response.data
  }

  // Get standings
  async getStandings(params: { league: number; season: number }) {
    const response = await this.client.get('/standings', { params })
    return response.data
  }

  // Get head to head
  async getH2H(params: { h2h: string; last?: number }) {
    const response = await this.client.get('/fixtures/headtohead', { params })
    return response.data
  }

  // Reset daily counter (should be called at midnight)
  resetDailyCounter() {
    this.requestCount = 0
    logger.info('API Football counter reset')
  }
}

export const apiFootballClient = new ApiFootballClient()
