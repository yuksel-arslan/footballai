export interface TeamStatsData {
  id: string
  teamId: number
  leagueId: number
  season: number
  rank: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  points: number
  form: string | null
  team: {
    id: number
    name: string
    logo: string | null
  }
}

export interface H2HSummary {
  team1Wins: number
  team2Wins: number
  draws: number
  totalGames: number
}

export interface TeamComparison {
  team1: TeamStatsData | null
  team2: TeamStatsData | null
  h2h: {
    summary: H2HSummary | null
    history: any[]
  }
}
