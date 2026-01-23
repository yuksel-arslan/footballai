import axios, { AxiosInstance } from 'axios'
import { config } from '@/config'

class ApiFootballClient {
  private client: AxiosInstance
  private requestCount = 0
  private readonly dailyLimit = config.apiFootball.rateLimitPerDay

  constructor() {
    this.client = axios.create({
      baseURL: config.apiFootball.baseUrl,
      timeout: config.apiFootball.timeout,
      headers: {
        'x-rapidapi-key': config.apiFootball.key,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    })

    // Request interceptor for rate limiting
    this.client.interceptors.request.use((config) => {
      this.requestCount++
      console.log(`📡 API Football request #${this.requestCount}/${this.dailyLimit}`)
      
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
  async getTeamStatistics(params: { team: number; season: number; league: number }) {
    const response = await this.client.get('/teams/statistics', { params })
    return response.data
  }

  // Get leagues
  async getLeagues(params?: { id?: number; country?: string; season?: number }) {
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
    console.log('🔄 API Football counter reset')
  }
}

export const apiFootballClient = new ApiFootballClient()
