// Mock data for development and demo purposes
// Used when API is unavailable

import { Fixture, Team, League } from './api'

// Leagues with country info
export const LEAGUES: Record<string, League & { country: string; countryCode: string; language: string }> = {
  PL: {
    id: 1,
    name: 'Premier League',
    country: 'England',
    countryCode: 'GB',
    language: 'en',
    logoUrl: 'https://crests.football-data.org/PL.png',
  },
  PD: {
    id: 2,
    name: 'La Liga',
    country: 'Spain',
    countryCode: 'ES',
    language: 'es',
    logoUrl: 'https://crests.football-data.org/PD.png',
  },
  BL1: {
    id: 3,
    name: 'Bundesliga',
    country: 'Germany',
    countryCode: 'DE',
    language: 'de',
    logoUrl: 'https://crests.football-data.org/BL1.png',
  },
  SA: {
    id: 4,
    name: 'Serie A',
    country: 'Italy',
    countryCode: 'IT',
    language: 'it',
    logoUrl: 'https://crests.football-data.org/SA.png',
  },
  FL1: {
    id: 5,
    name: 'Ligue 1',
    country: 'France',
    countryCode: 'FR',
    language: 'fr',
    logoUrl: 'https://crests.football-data.org/FL1.png',
  },
  TSL: {
    id: 6,
    name: 'Süper Lig',
    country: 'Türkiye',
    countryCode: 'TR',
    language: 'tr',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/tr/7/7f/S%C3%BCper_Lig_logo.png',
  },
  PPL: {
    id: 7,
    name: 'Primeira Liga',
    country: 'Portugal',
    countryCode: 'PT',
    language: 'pt',
    logoUrl: 'https://crests.football-data.org/PPL.png',
  },
  DED: {
    id: 8,
    name: 'Eredivisie',
    country: 'Netherlands',
    countryCode: 'NL',
    language: 'nl',
    logoUrl: 'https://crests.football-data.org/DED.png',
  },
  CL: {
    id: 9,
    name: 'Champions League',
    country: 'Europe',
    countryCode: 'EU',
    language: 'en',
    logoUrl: 'https://crests.football-data.org/CL.png',
  },
  EL: {
    id: 10,
    name: 'Europa League',
    country: 'Europe',
    countryCode: 'EU',
    language: 'en',
    logoUrl: 'https://crests.football-data.org/EL.png',
  },
}

// Country flags (emoji)
export const COUNTRY_FLAGS: Record<string, string> = {
  GB: '🇬🇧',
  ES: '🇪🇸',
  DE: '🇩🇪',
  IT: '🇮🇹',
  FR: '🇫🇷',
  TR: '🇹🇷',
  PT: '🇵🇹',
  NL: '🇳🇱',
  EU: '🇪🇺',
}

// Teams
const TEAMS: Record<string, Team> = {
  // Premier League
  LIV: { id: 64, name: 'Liverpool', code: 'LIV', logoUrl: 'https://crests.football-data.org/64.png' },
  MCI: { id: 65, name: 'Manchester City', code: 'MCI', logoUrl: 'https://crests.football-data.org/65.png' },
  ARS: { id: 57, name: 'Arsenal', code: 'ARS', logoUrl: 'https://crests.football-data.org/57.png' },
  CHE: { id: 61, name: 'Chelsea', code: 'CHE', logoUrl: 'https://crests.football-data.org/61.png' },
  MUN: { id: 66, name: 'Manchester United', code: 'MUN', logoUrl: 'https://crests.football-data.org/66.png' },
  TOT: { id: 73, name: 'Tottenham', code: 'TOT', logoUrl: 'https://crests.football-data.org/73.png' },
  NEW: { id: 67, name: 'Newcastle', code: 'NEW', logoUrl: 'https://crests.football-data.org/67.png' },
  AVL: { id: 58, name: 'Aston Villa', code: 'AVL', logoUrl: 'https://crests.football-data.org/58.png' },
  // La Liga
  RMA: { id: 86, name: 'Real Madrid', code: 'RMA', logoUrl: 'https://crests.football-data.org/86.png' },
  BAR: { id: 81, name: 'Barcelona', code: 'BAR', logoUrl: 'https://crests.football-data.org/81.png' },
  ATM: { id: 78, name: 'Atletico Madrid', code: 'ATM', logoUrl: 'https://crests.football-data.org/78.png' },
  // Bundesliga
  BAY: { id: 5, name: 'Bayern Munich', code: 'BAY', logoUrl: 'https://crests.football-data.org/5.png' },
  BVB: { id: 4, name: 'Borussia Dortmund', code: 'BVB', logoUrl: 'https://crests.football-data.org/4.png' },
  RBL: { id: 721, name: 'RB Leipzig', code: 'RBL', logoUrl: 'https://crests.football-data.org/721.png' },
  // Serie A
  JUV: { id: 109, name: 'Juventus', code: 'JUV', logoUrl: 'https://crests.football-data.org/109.png' },
  INT: { id: 108, name: 'Inter Milan', code: 'INT', logoUrl: 'https://crests.football-data.org/108.png' },
  ACM: { id: 98, name: 'AC Milan', code: 'ACM', logoUrl: 'https://crests.football-data.org/98.png' },
  NAP: { id: 113, name: 'Napoli', code: 'NAP', logoUrl: 'https://crests.football-data.org/113.png' },
  // Süper Lig
  GS: { id: 610, name: 'Galatasaray', code: 'GS', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Galatasaray_Sports_Club_Logo.png' },
  FB: { id: 611, name: 'Fenerbahçe', code: 'FB', logoUrl: 'https://upload.wikimedia.org/wikipedia/tr/8/86/Fenerbah%C3%A7e_SK.png' },
  BJK: { id: 612, name: 'Beşiktaş', code: 'BJK', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Be%C5%9Fikta%C5%9F_Logo_Be%C5%9Fikta%C5%9F_Amblem_Be%C5%9Fikta%C5%9F_Arma.png' },
  TS: { id: 613, name: 'Trabzonspor', code: 'TS', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/53/Trabzonspor_logo.png' },
  // Ligue 1
  PSG: { id: 524, name: 'Paris Saint-Germain', code: 'PSG', logoUrl: 'https://crests.football-data.org/524.png' },
  OLY: { id: 516, name: 'Olympique Lyon', code: 'OLY', logoUrl: 'https://crests.football-data.org/516.png' },
  OM: { id: 519, name: 'Olympique Marseille', code: 'OM', logoUrl: 'https://crests.football-data.org/519.png' },
}

// Generate mock fixtures
function generateMockFixtures(): Fixture[] {
  const now = new Date()
  const fixtures: Fixture[] = []
  let id = 1

  // Helper to create fixture
  const createFixture = (
    homeTeam: Team,
    awayTeam: Team,
    league: League,
    status: Fixture['status'],
    date: Date,
    homeScore?: number,
    awayScore?: number,
    minute?: number
  ): Fixture => ({
    id: id++,
    apiId: 1000 + id,
    homeTeam,
    awayTeam,
    league,
    matchDate: date.toISOString(),
    status,
    homeScore,
    awayScore,
    minute,
    predictions: [
      {
        homeWinProb: Math.random() * 0.5 + 0.2,
        drawProb: Math.random() * 0.3 + 0.1,
        awayWinProb: Math.random() * 0.5 + 0.2,
        predictedHomeScore: Math.floor(Math.random() * 3),
        predictedAwayScore: Math.floor(Math.random() * 3),
        confidence: Math.random() * 0.3 + 0.6,
      },
    ],
  })

  // Live matches
  fixtures.push(
    createFixture(TEAMS.LIV, TEAMS.MCI, LEAGUES.PL, 'LIVE', now, 2, 1, 67),
    createFixture(TEAMS.RMA, TEAMS.BAR, LEAGUES.PD, 'LIVE', now, 1, 1, 45),
    createFixture(TEAMS.GS, TEAMS.FB, LEAGUES.TSL, 'LIVE', now, 3, 2, 78),
  )

  // Upcoming matches (today and tomorrow)
  const upcoming1 = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours
  const upcoming2 = new Date(now.getTime() + 4 * 60 * 60 * 1000) // 4 hours
  const upcoming3 = new Date(now.getTime() + 24 * 60 * 60 * 1000) // tomorrow

  fixtures.push(
    createFixture(TEAMS.ARS, TEAMS.CHE, LEAGUES.PL, 'SCHEDULED', upcoming1),
    createFixture(TEAMS.BAY, TEAMS.BVB, LEAGUES.BL1, 'SCHEDULED', upcoming1),
    createFixture(TEAMS.INT, TEAMS.JUV, LEAGUES.SA, 'SCHEDULED', upcoming2),
    createFixture(TEAMS.PSG, TEAMS.OLY, LEAGUES.FL1, 'SCHEDULED', upcoming2),
    createFixture(TEAMS.BJK, TEAMS.TS, LEAGUES.TSL, 'SCHEDULED', upcoming3),
    createFixture(TEAMS.TOT, TEAMS.NEW, LEAGUES.PL, 'SCHEDULED', upcoming3),
    createFixture(TEAMS.ATM, TEAMS.RMA, LEAGUES.PD, 'SCHEDULED', upcoming3),
    createFixture(TEAMS.NAP, TEAMS.ACM, LEAGUES.SA, 'SCHEDULED', upcoming3),
  )

  // Finished matches (yesterday)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  fixtures.push(
    createFixture(TEAMS.MUN, TEAMS.AVL, LEAGUES.PL, 'FINISHED', yesterday, 2, 0),
    createFixture(TEAMS.RBL, TEAMS.BAY, LEAGUES.BL1, 'FINISHED', yesterday, 1, 3),
    createFixture(TEAMS.BAR, TEAMS.ATM, LEAGUES.PD, 'FINISHED', yesterday, 2, 2),
    createFixture(TEAMS.OM, TEAMS.PSG, LEAGUES.FL1, 'FINISHED', yesterday, 0, 2),
    createFixture(TEAMS.FB, TEAMS.BJK, LEAGUES.TSL, 'FINISHED', yesterday, 1, 0),
  )

  return fixtures
}

// Mock standings
export interface Standing {
  position: number
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  form: ('W' | 'D' | 'L')[]
}

export const MOCK_STANDINGS: Record<string, Standing[]> = {
  PL: [
    { position: 1, team: TEAMS.LIV, played: 22, won: 17, drawn: 3, lost: 2, goalsFor: 52, goalsAgainst: 18, goalDifference: 34, points: 54, form: ['W', 'W', 'D', 'W', 'W'] },
    { position: 2, team: TEAMS.MCI, played: 22, won: 15, drawn: 5, lost: 2, goalsFor: 48, goalsAgainst: 20, goalDifference: 28, points: 50, form: ['W', 'D', 'W', 'W', 'D'] },
    { position: 3, team: TEAMS.ARS, played: 22, won: 14, drawn: 6, lost: 2, goalsFor: 42, goalsAgainst: 18, goalDifference: 24, points: 48, form: ['D', 'W', 'W', 'D', 'W'] },
    { position: 4, team: TEAMS.CHE, played: 22, won: 12, drawn: 6, lost: 4, goalsFor: 40, goalsAgainst: 25, goalDifference: 15, points: 42, form: ['L', 'W', 'D', 'W', 'W'] },
    { position: 5, team: TEAMS.NEW, played: 22, won: 11, drawn: 7, lost: 4, goalsFor: 35, goalsAgainst: 22, goalDifference: 13, points: 40, form: ['W', 'D', 'D', 'W', 'L'] },
    { position: 6, team: TEAMS.TOT, played: 22, won: 10, drawn: 6, lost: 6, goalsFor: 38, goalsAgainst: 28, goalDifference: 10, points: 36, form: ['L', 'W', 'L', 'W', 'D'] },
    { position: 7, team: TEAMS.MUN, played: 22, won: 9, drawn: 7, lost: 6, goalsFor: 32, goalsAgainst: 26, goalDifference: 6, points: 34, form: ['W', 'L', 'D', 'D', 'W'] },
    { position: 8, team: TEAMS.AVL, played: 22, won: 9, drawn: 5, lost: 8, goalsFor: 30, goalsAgainst: 32, goalDifference: -2, points: 32, form: ['L', 'W', 'L', 'W', 'L'] },
  ],
  TSL: [
    { position: 1, team: TEAMS.GS, played: 20, won: 16, drawn: 2, lost: 2, goalsFor: 48, goalsAgainst: 15, goalDifference: 33, points: 50, form: ['W', 'W', 'W', 'D', 'W'] },
    { position: 2, team: TEAMS.FB, played: 20, won: 14, drawn: 4, lost: 2, goalsFor: 42, goalsAgainst: 16, goalDifference: 26, points: 46, form: ['W', 'D', 'W', 'W', 'W'] },
    { position: 3, team: TEAMS.BJK, played: 20, won: 12, drawn: 4, lost: 4, goalsFor: 36, goalsAgainst: 20, goalDifference: 16, points: 40, form: ['L', 'W', 'D', 'W', 'W'] },
    { position: 4, team: TEAMS.TS, played: 20, won: 10, drawn: 5, lost: 5, goalsFor: 30, goalsAgainst: 22, goalDifference: 8, points: 35, form: ['D', 'W', 'L', 'D', 'W'] },
  ],
  PD: [
    { position: 1, team: TEAMS.RMA, played: 21, won: 15, drawn: 4, lost: 2, goalsFor: 45, goalsAgainst: 18, goalDifference: 27, points: 49, form: ['W', 'W', 'D', 'W', 'W'] },
    { position: 2, team: TEAMS.BAR, played: 21, won: 14, drawn: 5, lost: 2, goalsFor: 48, goalsAgainst: 20, goalDifference: 28, points: 47, form: ['W', 'D', 'W', 'W', 'D'] },
    { position: 3, team: TEAMS.ATM, played: 21, won: 12, drawn: 6, lost: 3, goalsFor: 35, goalsAgainst: 16, goalDifference: 19, points: 42, form: ['D', 'W', 'W', 'D', 'W'] },
  ],
  BL1: [
    { position: 1, team: TEAMS.BAY, played: 20, won: 14, drawn: 4, lost: 2, goalsFor: 50, goalsAgainst: 18, goalDifference: 32, points: 46, form: ['W', 'W', 'W', 'D', 'W'] },
    { position: 2, team: TEAMS.BVB, played: 20, won: 12, drawn: 5, lost: 3, goalsFor: 42, goalsAgainst: 22, goalDifference: 20, points: 41, form: ['W', 'D', 'W', 'L', 'W'] },
    { position: 3, team: TEAMS.RBL, played: 20, won: 11, drawn: 5, lost: 4, goalsFor: 38, goalsAgainst: 20, goalDifference: 18, points: 38, form: ['D', 'W', 'W', 'D', 'W'] },
  ],
  SA: [
    { position: 1, team: TEAMS.INT, played: 21, won: 15, drawn: 4, lost: 2, goalsFor: 46, goalsAgainst: 16, goalDifference: 30, points: 49, form: ['W', 'W', 'D', 'W', 'W'] },
    { position: 2, team: TEAMS.NAP, played: 21, won: 13, drawn: 5, lost: 3, goalsFor: 40, goalsAgainst: 18, goalDifference: 22, points: 44, form: ['W', 'D', 'W', 'W', 'D'] },
    { position: 3, team: TEAMS.JUV, played: 21, won: 12, drawn: 6, lost: 3, goalsFor: 35, goalsAgainst: 15, goalDifference: 20, points: 42, form: ['D', 'W', 'W', 'D', 'W'] },
    { position: 4, team: TEAMS.ACM, played: 21, won: 11, drawn: 6, lost: 4, goalsFor: 34, goalsAgainst: 20, goalDifference: 14, points: 39, form: ['L', 'W', 'D', 'W', 'W'] },
  ],
  FL1: [
    { position: 1, team: TEAMS.PSG, played: 20, won: 16, drawn: 2, lost: 2, goalsFor: 52, goalsAgainst: 15, goalDifference: 37, points: 50, form: ['W', 'W', 'W', 'W', 'D'] },
    { position: 2, team: TEAMS.OLY, played: 20, won: 12, drawn: 4, lost: 4, goalsFor: 38, goalsAgainst: 22, goalDifference: 16, points: 40, form: ['W', 'D', 'L', 'W', 'W'] },
    { position: 3, team: TEAMS.OM, played: 20, won: 11, drawn: 5, lost: 4, goalsFor: 35, goalsAgainst: 20, goalDifference: 15, points: 38, form: ['D', 'W', 'W', 'L', 'W'] },
  ],
}

// Export mock data
export const MOCK_FIXTURES = generateMockFixtures()

// Stats
export const MOCK_STATS = {
  totalFixtures: MOCK_FIXTURES.length,
  liveMatches: MOCK_FIXTURES.filter(f => f.status === 'LIVE').length,
  totalPredictions: MOCK_FIXTURES.length,
  modelAccuracy: 0.72,
}

// Helper to get fixtures by status
export function getFixturesByStatus(status?: 'LIVE' | 'SCHEDULED' | 'FINISHED') {
  if (!status) return MOCK_FIXTURES
  return MOCK_FIXTURES.filter(f => f.status === status || (status === 'LIVE' && f.status === 'HALFTIME'))
}

// Helper to get fixtures by league
export function getFixturesByLeague(leagueCode: string) {
  const league = LEAGUES[leagueCode]
  if (!league) return []
  return MOCK_FIXTURES.filter(f => f.league.id === league.id)
}

// Get all leagues as array
export function getAllLeagues() {
  return Object.values(LEAGUES)
}
