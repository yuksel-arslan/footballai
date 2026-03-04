// Static mock data for Turkish Super League (2025-2026 season)
// Used as last-resort fallback when external APIs are unreachable

import type { Standing } from './reference-data'
import type { Fixture } from './api'

const TSL_LEAGUE = {
  id: 203,
  name: 'Süper Lig',
  country: 'Türkiye',
  logoUrl:
    'https://upload.wikimedia.org/wikipedia/tr/7/7f/S%C3%BCper_Lig_logo.png',
}

// 2025-2026 season standings snapshot
export const TSL_STANDINGS: Standing[] = [
  {
    position: 1,
    team: { id: 645, name: 'Galatasaray', code: 'GAL' },
    played: 24,
    won: 18,
    drawn: 4,
    lost: 2,
    goalsFor: 55,
    goalsAgainst: 18,
    goalDifference: 37,
    points: 58,
    form: ['W', 'W', 'D', 'W', 'W'],
  },
  {
    position: 2,
    team: { id: 611, name: 'Fenerbahçe', code: 'FB' },
    played: 24,
    won: 17,
    drawn: 3,
    lost: 4,
    goalsFor: 50,
    goalsAgainst: 20,
    goalDifference: 30,
    points: 54,
    form: ['W', 'L', 'W', 'W', 'D'],
  },
  {
    position: 3,
    team: { id: 549, name: 'Beşiktaş', code: 'BJK' },
    played: 24,
    won: 14,
    drawn: 5,
    lost: 5,
    goalsFor: 42,
    goalsAgainst: 22,
    goalDifference: 20,
    points: 47,
    form: ['W', 'D', 'W', 'L', 'W'],
  },
  {
    position: 4,
    team: { id: 3563, name: 'Trabzonspor', code: 'TS' },
    played: 24,
    won: 13,
    drawn: 5,
    lost: 6,
    goalsFor: 38,
    goalsAgainst: 24,
    goalDifference: 14,
    points: 44,
    form: ['D', 'W', 'W', 'L', 'W'],
  },
  {
    position: 5,
    team: { id: 3589, name: 'Başakşehir', code: 'IBB' },
    played: 24,
    won: 12,
    drawn: 6,
    lost: 6,
    goalsFor: 35,
    goalsAgainst: 23,
    goalDifference: 12,
    points: 42,
    form: ['W', 'D', 'D', 'W', 'L'],
  },
  {
    position: 6,
    team: { id: 607, name: 'Adana Demirspor', code: 'ADS' },
    played: 24,
    won: 11,
    drawn: 5,
    lost: 8,
    goalsFor: 33,
    goalsAgainst: 28,
    goalDifference: 5,
    points: 38,
    form: ['L', 'W', 'D', 'W', 'W'],
  },
  {
    position: 7,
    team: { id: 3573, name: 'Antalyaspor', code: 'ANT' },
    played: 24,
    won: 10,
    drawn: 6,
    lost: 8,
    goalsFor: 30,
    goalsAgainst: 26,
    goalDifference: 4,
    points: 36,
    form: ['D', 'L', 'W', 'W', 'D'],
  },
  {
    position: 8,
    team: { id: 3591, name: 'Sivasspor', code: 'SIV' },
    played: 24,
    won: 9,
    drawn: 7,
    lost: 8,
    goalsFor: 28,
    goalsAgainst: 25,
    goalDifference: 3,
    points: 34,
    form: ['W', 'D', 'L', 'D', 'W'],
  },
  {
    position: 9,
    team: { id: 3569, name: 'Konyaspor', code: 'KON' },
    played: 24,
    won: 9,
    drawn: 6,
    lost: 9,
    goalsFor: 27,
    goalsAgainst: 28,
    goalDifference: -1,
    points: 33,
    form: ['L', 'W', 'D', 'L', 'W'],
  },
  {
    position: 10,
    team: { id: 3575, name: 'Kasımpaşa', code: 'KAS' },
    played: 24,
    won: 8,
    drawn: 7,
    lost: 9,
    goalsFor: 29,
    goalsAgainst: 30,
    goalDifference: -1,
    points: 31,
    form: ['D', 'W', 'L', 'D', 'L'],
  },
  {
    position: 11,
    team: { id: 3571, name: 'Gaziantep FK', code: 'GFK' },
    played: 24,
    won: 8,
    drawn: 6,
    lost: 10,
    goalsFor: 25,
    goalsAgainst: 30,
    goalDifference: -5,
    points: 30,
    form: ['L', 'D', 'W', 'L', 'D'],
  },
  {
    position: 12,
    team: { id: 3577, name: 'Alanyaspor', code: 'ALN' },
    played: 24,
    won: 7,
    drawn: 8,
    lost: 9,
    goalsFor: 24,
    goalsAgainst: 28,
    goalDifference: -4,
    points: 29,
    form: ['D', 'D', 'L', 'W', 'D'],
  },
  {
    position: 13,
    team: { id: 3567, name: 'Kayserispor', code: 'KAY' },
    played: 24,
    won: 7,
    drawn: 5,
    lost: 12,
    goalsFor: 22,
    goalsAgainst: 34,
    goalDifference: -12,
    points: 26,
    form: ['L', 'L', 'W', 'D', 'L'],
  },
  {
    position: 14,
    team: { id: 3579, name: 'Samsunspor', code: 'SAM' },
    played: 24,
    won: 6,
    drawn: 7,
    lost: 11,
    goalsFor: 21,
    goalsAgainst: 32,
    goalDifference: -11,
    points: 25,
    form: ['D', 'L', 'L', 'W', 'D'],
  },
  {
    position: 15,
    team: { id: 3581, name: 'Hatayspor', code: 'HAT' },
    played: 24,
    won: 6,
    drawn: 6,
    lost: 12,
    goalsFor: 20,
    goalsAgainst: 35,
    goalDifference: -15,
    points: 24,
    form: ['L', 'D', 'L', 'L', 'W'],
  },
  {
    position: 16,
    team: { id: 3583, name: 'Pendikspor', code: 'PEN' },
    played: 24,
    won: 5,
    drawn: 7,
    lost: 12,
    goalsFor: 19,
    goalsAgainst: 33,
    goalDifference: -14,
    points: 22,
    form: ['L', 'D', 'L', 'D', 'L'],
  },
  {
    position: 17,
    team: { id: 3585, name: 'Rizespor', code: 'RIZ' },
    played: 24,
    won: 5,
    drawn: 5,
    lost: 14,
    goalsFor: 18,
    goalsAgainst: 38,
    goalDifference: -20,
    points: 20,
    form: ['L', 'L', 'D', 'L', 'L'],
  },
  {
    position: 18,
    team: { id: 3587, name: 'İstanbulspor', code: 'IST' },
    played: 24,
    won: 4,
    drawn: 6,
    lost: 14,
    goalsFor: 16,
    goalsAgainst: 40,
    goalDifference: -24,
    points: 18,
    form: ['L', 'L', 'L', 'D', 'L'],
  },
]

// Sample upcoming fixtures for TSL
function generateTSLFixtures(): Fixture[] {
  const now = new Date()
  const fixtures: Fixture[] = []
  const matchups = [
    { home: TSL_STANDINGS[0], away: TSL_STANDINGS[3] }, // GS vs TS
    { home: TSL_STANDINGS[1], away: TSL_STANDINGS[2] }, // FB vs BJK
    { home: TSL_STANDINGS[4], away: TSL_STANDINGS[5] }, // IBB vs ADS
    { home: TSL_STANDINGS[6], away: TSL_STANDINGS[7] }, // ANT vs SIV
    { home: TSL_STANDINGS[8], away: TSL_STANDINGS[9] }, // KON vs KAS
  ]

  matchups.forEach((m, i) => {
    const matchDate = new Date(now)
    matchDate.setDate(matchDate.getDate() + i + 1)
    matchDate.setHours(19, 0, 0, 0)

    fixtures.push({
      id: 90000 + i,
      apiId: 90000 + i,
      homeTeam: {
        id: m.home.team.id,
        name: m.home.team.name,
        code: m.home.team.code,
      },
      awayTeam: {
        id: m.away.team.id,
        name: m.away.team.name,
        code: m.away.team.code,
      },
      league: TSL_LEAGUE,
      matchDate: matchDate.toISOString(),
      status: 'SCHEDULED',
    })
  })

  return fixtures
}

export const TSL_FIXTURES = generateTSLFixtures()
