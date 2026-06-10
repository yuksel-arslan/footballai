import axios, { AxiosInstance } from 'axios'
import { config } from '../config'
import { logger } from '../lib/logger'

class ApiFootballClient {
  private client: AxiosInstance
  private requestCount = 0
  private countDay = new Date().toISOString().slice(0, 10)
  private readonly dailyLimit = config.apiFootball.rateLimitPerDay

  constructor() {
    this.client = axios.create({
      baseURL: config.apiFootball.baseUrl,
      timeout: config.apiFootball.timeout,
      headers: { 'x-apisports-key': config.apiFootball.key },
    })
    logger.info('API-Football client initialised')

    // Request interceptor for rate limiting
    this.client.interceptors.request.use((config) => {
      // The counter is per calendar day, not per process lifetime
      const today = new Date().toISOString().slice(0, 10)
      if (today !== this.countDay) {
        this.countDay = today
        this.requestCount = 0
      }
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

  // Get fixtures by date (or a single fixture by id)
  async getFixtures(params: {
    id?: number
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

  // Get odds for a fixture (bet=1 → Match Winner / 1X2 market)
  async getOdds(params: { fixture: number; bet?: number }) {
    const response = await this.client.get('/odds', {
      params: { bet: 1, ...params },
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
