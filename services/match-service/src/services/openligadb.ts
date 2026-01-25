import axios, { AxiosInstance } from 'axios'

/**
 * OpenLigaDB API Client (Backup/Fallback)
 * Completely FREE - No API key required, No rate limits
 * Focus: Bundesliga, Champions League, World Cup
 * Docs: https://www.openligadb.de/
 */
class OpenLigaDBClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.openligadb.de',
      timeout: 10000,
    })

    this.client.interceptors.request.use((config) => {
      console.log(`📡 OpenLigaDB request: ${config.url}`)
      return config
    })
  }

  // Available leagues/shortcuts
  static readonly LEAGUES = {
    BUNDESLIGA_1: 'bl1',
    BUNDESLIGA_2: 'bl2',
    BUNDESLIGA_3: 'bl3',
    DFB_POKAL: 'dfb',
    CHAMPIONS_LEAGUE: 'cl',
    EUROPA_LEAGUE: 'el',
    WORLD_CUP: 'wm',
    EURO: 'em',
  } as const

  // Get current season year
  private getCurrentSeason(): number {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    // Football season starts in August
    return month >= 8 ? year : year - 1
  }

  // Get all matches for a league and season
  async getMatchesBySeason(league: string, season?: number) {
    const seasonYear = season || this.getCurrentSeason()
    const response = await this.client.get(`/getmatchdata/${league}/${seasonYear}`)
    return response.data
  }

  // Get matches for a specific matchday
  async getMatchesByMatchday(league: string, season: number, matchday: number) {
    const response = await this.client.get(`/getmatchdata/${league}/${season}/${matchday}`)
    return response.data
  }

  // Get current matchday matches
  async getCurrentMatches(league: string) {
    const response = await this.client.get(`/getmatchdata/${league}`)
    return response.data
  }

  // Get match by ID
  async getMatchById(matchId: number) {
    const response = await this.client.get(`/getmatchdata/${matchId}`)
    return response.data
  }

  // Get next match for a team
  async getNextMatchByTeam(teamId: number, league: string, _season?: number) {
    const response = await this.client.get(`/getnextmatchbyleagueteam/${league}/${teamId}`)
    return response.data
  }

  // Get standings (league table)
  async getStandings(league: string, season?: number) {
    const seasonYear = season || this.getCurrentSeason()
    const response = await this.client.get(`/getbltable/${league}/${seasonYear}`)
    return response.data
  }

  // Get all teams in a league
  async getTeams(league: string, season?: number) {
    const seasonYear = season || this.getCurrentSeason()
    const response = await this.client.get(`/getavailableteams/${league}/${seasonYear}`)
    return response.data
  }

  // Get available leagues
  async getAvailableLeagues() {
    const response = await this.client.get('/getavailableleagues')
    return response.data
  }

  // Get available seasons for a league
  async getAvailableSeasons(league: string) {
    const response = await this.client.get(`/getavailablegroups/${league}`)
    return response.data
  }

  // Get last match for a league
  async getLastMatch(league: string) {
    const response = await this.client.get(`/getlastmatchbyleague/${league}`)
    return response.data
  }

  // Get next match for a league
  async getNextMatch(league: string) {
    const response = await this.client.get(`/getnextmatchbyleague/${league}`)
    return response.data
  }

  // Get current matchday number
  async getCurrentMatchday(league: string) {
    const response = await this.client.get(`/getcurrentgroup/${league}`)
    return response.data
  }

  // Get goals for a match
  async getGoalsByMatch(matchId: number) {
    const response = await this.client.get(`/getgoals/${matchId}`)
    return response.data
  }

  // Helper: Get today's Bundesliga matches
  async getTodayBundesligaMatches() {
    return this.getCurrentMatches(OpenLigaDBClient.LEAGUES.BUNDESLIGA_1)
  }

  // Helper: Get Bundesliga standings
  async getBundesligaStandings(season?: number) {
    return this.getStandings(OpenLigaDBClient.LEAGUES.BUNDESLIGA_1, season)
  }

  // Helper: Get Champions League matches
  async getChampionsLeagueMatches(season?: number) {
    return this.getMatchesBySeason(OpenLigaDBClient.LEAGUES.CHAMPIONS_LEAGUE, season)
  }
}

export const openLigaDBClient = new OpenLigaDBClient()
