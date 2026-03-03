// Match Types
export interface Match {
  id: number
  apiId: number
  homeTeam: Team
  awayTeam: Team
  league: League
  matchDate: Date
  status: MatchStatus
  homeScore?: number
  awayScore?: number
  venue?: string
  referee?: string
  minute?: number
}

export type MatchStatus =
  | 'SCHEDULED'
  | 'LIVE'
  | 'HALFTIME'
  | 'FINISHED'
  | 'POSTPONED'
  | 'CANCELLED'

// Team Types
export interface Team {
  id: number
  apiId: number
  name: string
  code?: string
  logoUrl?: string
  country: string
}

// League Types
export interface League {
  id: number
  apiId: number
  name: string
  country: string
  logoUrl?: string
  season: number
}

// Prediction Types
export interface Prediction {
  id: number
  fixtureId: number
  modelVersion: string
  probabilities: {
    homeWin: number
    draw: number
    awayWin: number
  }
  predictedScore: {
    home: number
    away: number
  }
  confidence: number
  explanation?: string
  keyFactors?: KeyFactor[]
  createdAt: Date
}

export interface KeyFactor {
  factor: string
  impact: number
  description: string
}

// Statistics Types
export interface TeamStats {
  teamId: number
  season: number
  matchesPlayed: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  cleanSheets: number
  lastFiveForm?: string
  leaguePosition?: number
  points: number
}

// User Types
export interface User {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  country?: string
  preferredLang: string
  theme: 'light' | 'dark'
}
