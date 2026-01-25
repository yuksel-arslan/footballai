import { footballDataClient } from './football-data'
import { openLigaDBClient } from './openligadb'
import { config } from '@/config'

/**
 * Unified Football Data Provider
 * Uses Football-Data.org as primary source, falls back to OpenLigaDB
 *
 * Strategy:
 * 1. Football-Data.org (Primary) - Top 12 leagues, 10 req/min
 * 2. OpenLigaDB (Fallback) - Bundesliga/CL, unlimited
 */

// League mapping between APIs
const LEAGUE_MAPPING = {
  // Football-Data.org code -> OpenLigaDB shortcut
  'PL': null, // Premier League - not in OpenLigaDB
  'PD': null, // La Liga - not in OpenLigaDB
  'BL1': 'bl1', // Bundesliga
  'SA': null, // Serie A - not in OpenLigaDB
  'FL1': null, // Ligue 1 - not in OpenLigaDB
  'CL': 'cl', // Champions League
  'EL': 'el', // Europa League
  'WC': 'wm', // World Cup
  'EC': 'em', // Euro
} as const

// Normalize match data from different APIs to a common format
interface NormalizedMatch {
  id: string
  source: 'football-data' | 'openligadb'
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED'
  utcDate: string
  matchday?: number
  competition: {
    id: string
    name: string
    code?: string
  }
  homeTeam: {
    id: string
    name: string
    shortName?: string
    crest?: string
  }
  awayTeam: {
    id: string
    name: string
    shortName?: string
    crest?: string
  }
  score: {
    home: number | null
    away: number | null
    halfTime?: {
      home: number | null
      away: number | null
    }
  }
}

interface NormalizedStanding {
  position: number
  team: {
    id: string
    name: string
    shortName?: string
    crest?: string
  }
  playedGames: number
  won: number
  draw: number
  lost: number
  points: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
}

class FootballDataProvider {
  private primaryAvailable: boolean

  constructor() {
    // Check if Football-Data.org API key is configured
    this.primaryAvailable = !!config.footballData.key

    if (!this.primaryAvailable) {
      console.log('⚠️ Football-Data.org key not set. Using OpenLigaDB only.')
    }
  }

  // Normalize Football-Data.org match to common format
  private normalizeFootballDataMatch(match: any): NormalizedMatch {
    return {
      id: `fd-${match.id}`,
      source: 'football-data',
      status: match.status,
      utcDate: match.utcDate,
      matchday: match.matchday,
      competition: {
        id: `fd-${match.competition?.id}`,
        name: match.competition?.name || 'Unknown',
        code: match.competition?.code,
      },
      homeTeam: {
        id: `fd-${match.homeTeam?.id}`,
        name: match.homeTeam?.name || 'Unknown',
        shortName: match.homeTeam?.shortName,
        crest: match.homeTeam?.crest,
      },
      awayTeam: {
        id: `fd-${match.awayTeam?.id}`,
        name: match.awayTeam?.name || 'Unknown',
        shortName: match.awayTeam?.shortName,
        crest: match.awayTeam?.crest,
      },
      score: {
        home: match.score?.fullTime?.home ?? null,
        away: match.score?.fullTime?.away ?? null,
        halfTime: match.score?.halfTime
          ? {
              home: match.score.halfTime.home ?? null,
              away: match.score.halfTime.away ?? null,
            }
          : undefined,
      },
    }
  }

  // Normalize OpenLigaDB match to common format
  private normalizeOpenLigaMatch(match: any): NormalizedMatch {
    const finalResult = match.matchResults?.find((r: any) => r.resultTypeID === 2) // Final result
    const halfTimeResult = match.matchResults?.find((r: any) => r.resultTypeID === 1) // Half time

    let status: NormalizedMatch['status'] = 'SCHEDULED'
    if (match.matchIsFinished) {
      status = 'FINISHED'
    } else if (finalResult || halfTimeResult) {
      status = 'LIVE'
    }

    return {
      id: `ol-${match.matchID}`,
      source: 'openligadb',
      status,
      utcDate: match.matchDateTimeUTC || match.matchDateTime,
      matchday: match.group?.groupOrderID,
      competition: {
        id: `ol-${match.leagueId}`,
        name: match.leagueName || 'Unknown',
      },
      homeTeam: {
        id: `ol-${match.team1?.teamId}`,
        name: match.team1?.teamName || 'Unknown',
        shortName: match.team1?.shortName,
        crest: match.team1?.teamIconUrl,
      },
      awayTeam: {
        id: `ol-${match.team2?.teamId}`,
        name: match.team2?.teamName || 'Unknown',
        shortName: match.team2?.shortName,
        crest: match.team2?.teamIconUrl,
      },
      score: {
        home: finalResult?.pointsTeam1 ?? null,
        away: finalResult?.pointsTeam2 ?? null,
        halfTime: halfTimeResult
          ? {
              home: halfTimeResult.pointsTeam1 ?? null,
              away: halfTimeResult.pointsTeam2 ?? null,
            }
          : undefined,
      },
    }
  }

  // Normalize OpenLigaDB standing to common format
  private normalizeOpenLigaStanding(standing: any): NormalizedStanding {
    return {
      position: standing.tablePosition || 0,
      team: {
        id: `ol-${standing.teamInfoId}`,
        name: standing.teamName || 'Unknown',
        shortName: standing.shortName,
        crest: standing.teamIconUrl,
      },
      playedGames: standing.matches || 0,
      won: standing.won || 0,
      draw: standing.draw || 0,
      lost: standing.lost || 0,
      points: standing.points || 0,
      goalsFor: standing.goals || 0,
      goalsAgainst: standing.opponentGoals || 0,
      goalDifference: standing.goalDiff || 0,
    }
  }

  // Normalize Football-Data.org standing to common format
  private normalizeFootballDataStanding(standing: any): NormalizedStanding {
    return {
      position: standing.position,
      team: {
        id: `fd-${standing.team?.id}`,
        name: standing.team?.name || 'Unknown',
        shortName: standing.team?.shortName,
        crest: standing.team?.crest,
      },
      playedGames: standing.playedGames || 0,
      won: standing.won || 0,
      draw: standing.draw || 0,
      lost: standing.lost || 0,
      points: standing.points || 0,
      goalsFor: standing.goalsFor || 0,
      goalsAgainst: standing.goalsAgainst || 0,
      goalDifference: standing.goalDifference || 0,
    }
  }

  /**
   * Get matches for a competition
   * Falls back to OpenLigaDB if Football-Data.org fails
   */
  async getMatches(options: {
    competition?: string
    dateFrom?: string
    dateTo?: string
    status?: 'SCHEDULED' | 'LIVE' | 'FINISHED'
  }): Promise<{ matches: NormalizedMatch[]; source: string }> {
    const { competition, dateFrom, dateTo, status } = options

    // Try Football-Data.org first
    if (this.primaryAvailable) {
      try {
        const params: any = {}
        if (dateFrom) params.dateFrom = dateFrom
        if (dateTo) params.dateTo = dateTo
        if (status) params.status = status

        let response
        if (competition) {
          response = await footballDataClient.getCompetitionMatches(competition, params)
        } else {
          response = await footballDataClient.getMatches(params)
        }

        const matches = (response.matches || []).map((m: any) => this.normalizeFootballDataMatch(m))
        return { matches, source: 'football-data.org' }
      } catch (error) {
        console.error('❌ Football-Data.org failed:', error)
        // Fall through to OpenLigaDB
      }
    }

    // Fallback to OpenLigaDB (limited coverage)
    try {
      const openLigaCode = competition ? LEAGUE_MAPPING[competition as keyof typeof LEAGUE_MAPPING] : 'bl1'

      if (!openLigaCode) {
        console.warn(`⚠️ Competition ${competition} not available in OpenLigaDB fallback`)
        return { matches: [], source: 'openligadb (no coverage)' }
      }

      const response = await openLigaDBClient.getCurrentMatches(openLigaCode)
      const matches = (Array.isArray(response) ? response : [])
        .map((m: any) => this.normalizeOpenLigaMatch(m))
        .filter((m: NormalizedMatch) => {
          if (!status) return true
          return m.status === status
        })

      return { matches, source: 'openligadb' }
    } catch (error) {
      console.error('❌ OpenLigaDB also failed:', error)
      return { matches: [], source: 'error' }
    }
  }

  /**
   * Get standings for a competition
   */
  async getStandings(competition: string): Promise<{
    standings: NormalizedStanding[]
    source: string
  }> {
    // Try Football-Data.org first
    if (this.primaryAvailable) {
      try {
        const response = await footballDataClient.getStandings(competition)
        const table = response.standings?.[0]?.table || []
        const standings = table.map((s: any) => this.normalizeFootballDataStanding(s))
        return { standings, source: 'football-data.org' }
      } catch (error) {
        console.error('❌ Football-Data.org standings failed:', error)
      }
    }

    // Fallback to OpenLigaDB
    try {
      const openLigaCode = LEAGUE_MAPPING[competition as keyof typeof LEAGUE_MAPPING]

      if (!openLigaCode) {
        console.warn(`⚠️ Competition ${competition} not available in OpenLigaDB`)
        return { standings: [], source: 'openligadb (no coverage)' }
      }

      const response = await openLigaDBClient.getStandings(openLigaCode)
      const standings = (Array.isArray(response) ? response : []).map((s: any) =>
        this.normalizeOpenLigaStanding(s)
      )
      return { standings, source: 'openligadb' }
    } catch (error) {
      console.error('❌ OpenLigaDB standings also failed:', error)
      return { standings: [], source: 'error' }
    }
  }

  /**
   * Get live matches across supported competitions
   */
  async getLiveMatches(): Promise<{ matches: NormalizedMatch[]; source: string }> {
    return this.getMatches({ status: 'LIVE' })
  }

  /**
   * Get today's matches
   */
  async getTodayMatches(competition?: string): Promise<{ matches: NormalizedMatch[]; source: string }> {
    const today = new Date().toISOString().split('T')[0]
    return this.getMatches({
      competition,
      dateFrom: today,
      dateTo: today,
    })
  }

  /**
   * Get available competitions
   */
  async getCompetitions() {
    if (this.primaryAvailable) {
      try {
        const response = await footballDataClient.getCompetitions()
        return {
          competitions: response.competitions || [],
          source: 'football-data.org',
        }
      } catch (error) {
        console.error('❌ Football-Data.org competitions failed:', error)
      }
    }

    // Fallback - return OpenLigaDB supported leagues
    try {
      const response = await openLigaDBClient.getAvailableLeagues()
      return {
        competitions: response || [],
        source: 'openligadb',
      }
    } catch (error) {
      console.error('❌ OpenLigaDB leagues also failed:', error)
      return { competitions: [], source: 'error' }
    }
  }

  /**
   * Check which APIs are available
   */
  getStatus() {
    return {
      primary: {
        name: 'Football-Data.org',
        available: this.primaryAvailable,
        coverage: 'Top 12 leagues (PL, La Liga, Bundesliga, Serie A, CL, etc.)',
        limit: '10 requests/minute',
      },
      fallback: {
        name: 'OpenLigaDB',
        available: true, // Always available, no key needed
        coverage: 'Bundesliga, CL, EL, World Cup, Euro',
        limit: 'Unlimited',
      },
    }
  }
}

export const footballProvider = new FootballDataProvider()
