import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const currentSeason = 2024

// League data with API-Football IDs
const leagues = [
  // Turkey
  {
    apiId: 203,
    name: 'Super Lig',
    country: 'Turkey',
    logoUrl: 'https://media.api-sports.io/football/leagues/203.png',
  },

  // England
  {
    apiId: 39,
    name: 'Premier League',
    country: 'England',
    logoUrl: 'https://media.api-sports.io/football/leagues/39.png',
  },
  {
    apiId: 40,
    name: 'Championship',
    country: 'England',
    logoUrl: 'https://media.api-sports.io/football/leagues/40.png',
  },

  // Spain
  {
    apiId: 140,
    name: 'La Liga',
    country: 'Spain',
    logoUrl: 'https://media.api-sports.io/football/leagues/140.png',
  },

  // Germany
  {
    apiId: 78,
    name: 'Bundesliga',
    country: 'Germany',
    logoUrl: 'https://media.api-sports.io/football/leagues/78.png',
  },

  // Italy
  {
    apiId: 135,
    name: 'Serie A',
    country: 'Italy',
    logoUrl: 'https://media.api-sports.io/football/leagues/135.png',
  },

  // France
  {
    apiId: 61,
    name: 'Ligue 1',
    country: 'France',
    logoUrl: 'https://media.api-sports.io/football/leagues/61.png',
  },

  // Portugal
  {
    apiId: 94,
    name: 'Primeira Liga',
    country: 'Portugal',
    logoUrl: 'https://media.api-sports.io/football/leagues/94.png',
  },

  // Netherlands
  {
    apiId: 88,
    name: 'Eredivisie',
    country: 'Netherlands',
    logoUrl: 'https://media.api-sports.io/football/leagues/88.png',
  },

  // European Competitions
  {
    apiId: 2,
    name: 'UEFA Champions League',
    country: 'Europe',
    logoUrl: 'https://media.api-sports.io/football/leagues/2.png',
  },
  {
    apiId: 3,
    name: 'UEFA Europa League',
    country: 'Europe',
    logoUrl: 'https://media.api-sports.io/football/leagues/3.png',
  },
  {
    apiId: 848,
    name: 'UEFA Conference League',
    country: 'Europe',
    logoUrl: 'https://media.api-sports.io/football/leagues/848.png',
  },
]

// Teams by league
const teamsByLeague: Record<
  string,
  Array<{ apiId: number; name: string; code: string; logoUrl: string }>
> = {
  'Super Lig': [
    {
      apiId: 645,
      name: 'Galatasaray',
      code: 'GS',
      logoUrl: 'https://media.api-sports.io/football/teams/645.png',
    },
    {
      apiId: 611,
      name: 'Fenerbahce',
      code: 'FB',
      logoUrl: 'https://media.api-sports.io/football/teams/611.png',
    },
    {
      apiId: 549,
      name: 'Besiktas',
      code: 'BJK',
      logoUrl: 'https://media.api-sports.io/football/teams/549.png',
    },
    {
      apiId: 3563,
      name: 'Trabzonspor',
      code: 'TS',
      logoUrl: 'https://media.api-sports.io/football/teams/3563.png',
    },
    {
      apiId: 3589,
      name: 'Basaksehir',
      code: 'IBB',
      logoUrl: 'https://media.api-sports.io/football/teams/3589.png',
    },
    {
      apiId: 607,
      name: 'Adana Demirspor',
      code: 'ADS',
      logoUrl: 'https://media.api-sports.io/football/teams/607.png',
    },
    {
      apiId: 3573,
      name: 'Antalyaspor',
      code: 'ANT',
      logoUrl: 'https://media.api-sports.io/football/teams/3573.png',
    },
    {
      apiId: 3564,
      name: 'Konyaspor',
      code: 'KON',
      logoUrl: 'https://media.api-sports.io/football/teams/3564.png',
    },
    {
      apiId: 3569,
      name: 'Sivasspor',
      code: 'SIV',
      logoUrl: 'https://media.api-sports.io/football/teams/3569.png',
    },
    {
      apiId: 3574,
      name: 'Kasimpasa',
      code: 'KAS',
      logoUrl: 'https://media.api-sports.io/football/teams/3574.png',
    },
  ],

  'Premier League': [
    {
      apiId: 33,
      name: 'Manchester United',
      code: 'MUN',
      logoUrl: 'https://media.api-sports.io/football/teams/33.png',
    },
    {
      apiId: 34,
      name: 'Newcastle United',
      code: 'NEW',
      logoUrl: 'https://media.api-sports.io/football/teams/34.png',
    },
    {
      apiId: 40,
      name: 'Liverpool',
      code: 'LIV',
      logoUrl: 'https://media.api-sports.io/football/teams/40.png',
    },
    {
      apiId: 42,
      name: 'Arsenal',
      code: 'ARS',
      logoUrl: 'https://media.api-sports.io/football/teams/42.png',
    },
    {
      apiId: 47,
      name: 'Tottenham',
      code: 'TOT',
      logoUrl: 'https://media.api-sports.io/football/teams/47.png',
    },
    {
      apiId: 49,
      name: 'Chelsea',
      code: 'CHE',
      logoUrl: 'https://media.api-sports.io/football/teams/49.png',
    },
    {
      apiId: 50,
      name: 'Manchester City',
      code: 'MCI',
      logoUrl: 'https://media.api-sports.io/football/teams/50.png',
    },
    {
      apiId: 66,
      name: 'Aston Villa',
      code: 'AVL',
      logoUrl: 'https://media.api-sports.io/football/teams/66.png',
    },
    {
      apiId: 52,
      name: 'West Ham',
      code: 'WHU',
      logoUrl: 'https://media.api-sports.io/football/teams/52.png',
    },
    {
      apiId: 51,
      name: 'Brighton',
      code: 'BHA',
      logoUrl: 'https://media.api-sports.io/football/teams/51.png',
    },
  ],

  'La Liga': [
    {
      apiId: 529,
      name: 'Barcelona',
      code: 'BAR',
      logoUrl: 'https://media.api-sports.io/football/teams/529.png',
    },
    {
      apiId: 541,
      name: 'Real Madrid',
      code: 'RMA',
      logoUrl: 'https://media.api-sports.io/football/teams/541.png',
    },
    {
      apiId: 530,
      name: 'Atletico Madrid',
      code: 'ATM',
      logoUrl: 'https://media.api-sports.io/football/teams/530.png',
    },
    {
      apiId: 536,
      name: 'Sevilla',
      code: 'SEV',
      logoUrl: 'https://media.api-sports.io/football/teams/536.png',
    },
    {
      apiId: 533,
      name: 'Villarreal',
      code: 'VIL',
      logoUrl: 'https://media.api-sports.io/football/teams/533.png',
    },
    {
      apiId: 548,
      name: 'Real Sociedad',
      code: 'RSO',
      logoUrl: 'https://media.api-sports.io/football/teams/548.png',
    },
    {
      apiId: 531,
      name: 'Athletic Bilbao',
      code: 'ATH',
      logoUrl: 'https://media.api-sports.io/football/teams/531.png',
    },
    {
      apiId: 532,
      name: 'Valencia',
      code: 'VAL',
      logoUrl: 'https://media.api-sports.io/football/teams/532.png',
    },
    {
      apiId: 543,
      name: 'Real Betis',
      code: 'BET',
      logoUrl: 'https://media.api-sports.io/football/teams/543.png',
    },
    {
      apiId: 546,
      name: 'Celta Vigo',
      code: 'CEL',
      logoUrl: 'https://media.api-sports.io/football/teams/546.png',
    },
  ],

  Bundesliga: [
    {
      apiId: 157,
      name: 'Bayern Munich',
      code: 'BAY',
      logoUrl: 'https://media.api-sports.io/football/teams/157.png',
    },
    {
      apiId: 165,
      name: 'Borussia Dortmund',
      code: 'BVB',
      logoUrl: 'https://media.api-sports.io/football/teams/165.png',
    },
    {
      apiId: 173,
      name: 'RB Leipzig',
      code: 'RBL',
      logoUrl: 'https://media.api-sports.io/football/teams/173.png',
    },
    {
      apiId: 168,
      name: 'Bayer Leverkusen',
      code: 'B04',
      logoUrl: 'https://media.api-sports.io/football/teams/168.png',
    },
    {
      apiId: 169,
      name: 'Eintracht Frankfurt',
      code: 'SGE',
      logoUrl: 'https://media.api-sports.io/football/teams/169.png',
    },
    {
      apiId: 161,
      name: 'VfL Wolfsburg',
      code: 'WOB',
      logoUrl: 'https://media.api-sports.io/football/teams/161.png',
    },
    {
      apiId: 163,
      name: 'Borussia Monchengladbach',
      code: 'BMG',
      logoUrl: 'https://media.api-sports.io/football/teams/163.png',
    },
    {
      apiId: 160,
      name: 'SC Freiburg',
      code: 'SCF',
      logoUrl: 'https://media.api-sports.io/football/teams/160.png',
    },
    {
      apiId: 162,
      name: 'Werder Bremen',
      code: 'SVW',
      logoUrl: 'https://media.api-sports.io/football/teams/162.png',
    },
    {
      apiId: 167,
      name: '1899 Hoffenheim',
      code: 'TSG',
      logoUrl: 'https://media.api-sports.io/football/teams/167.png',
    },
  ],

  'Serie A': [
    {
      apiId: 489,
      name: 'AC Milan',
      code: 'MIL',
      logoUrl: 'https://media.api-sports.io/football/teams/489.png',
    },
    {
      apiId: 505,
      name: 'Inter Milan',
      code: 'INT',
      logoUrl: 'https://media.api-sports.io/football/teams/505.png',
    },
    {
      apiId: 496,
      name: 'Juventus',
      code: 'JUV',
      logoUrl: 'https://media.api-sports.io/football/teams/496.png',
    },
    {
      apiId: 492,
      name: 'Napoli',
      code: 'NAP',
      logoUrl: 'https://media.api-sports.io/football/teams/492.png',
    },
    {
      apiId: 497,
      name: 'AS Roma',
      code: 'ROM',
      logoUrl: 'https://media.api-sports.io/football/teams/497.png',
    },
    {
      apiId: 487,
      name: 'Lazio',
      code: 'LAZ',
      logoUrl: 'https://media.api-sports.io/football/teams/487.png',
    },
    {
      apiId: 499,
      name: 'Atalanta',
      code: 'ATA',
      logoUrl: 'https://media.api-sports.io/football/teams/499.png',
    },
    {
      apiId: 502,
      name: 'Fiorentina',
      code: 'FIO',
      logoUrl: 'https://media.api-sports.io/football/teams/502.png',
    },
    {
      apiId: 503,
      name: 'Torino',
      code: 'TOR',
      logoUrl: 'https://media.api-sports.io/football/teams/503.png',
    },
    {
      apiId: 488,
      name: 'Sassuolo',
      code: 'SAS',
      logoUrl: 'https://media.api-sports.io/football/teams/488.png',
    },
  ],

  'Ligue 1': [
    {
      apiId: 85,
      name: 'Paris Saint-Germain',
      code: 'PSG',
      logoUrl: 'https://media.api-sports.io/football/teams/85.png',
    },
    {
      apiId: 81,
      name: 'Marseille',
      code: 'OM',
      logoUrl: 'https://media.api-sports.io/football/teams/81.png',
    },
    {
      apiId: 80,
      name: 'Lyon',
      code: 'OL',
      logoUrl: 'https://media.api-sports.io/football/teams/80.png',
    },
    {
      apiId: 91,
      name: 'Monaco',
      code: 'MON',
      logoUrl: 'https://media.api-sports.io/football/teams/91.png',
    },
    {
      apiId: 79,
      name: 'Lille',
      code: 'LIL',
      logoUrl: 'https://media.api-sports.io/football/teams/79.png',
    },
    {
      apiId: 94,
      name: 'Rennes',
      code: 'REN',
      logoUrl: 'https://media.api-sports.io/football/teams/94.png',
    },
    {
      apiId: 84,
      name: 'Nice',
      code: 'NIC',
      logoUrl: 'https://media.api-sports.io/football/teams/84.png',
    },
    {
      apiId: 93,
      name: 'Lens',
      code: 'LEN',
      logoUrl: 'https://media.api-sports.io/football/teams/93.png',
    },
    {
      apiId: 95,
      name: 'Strasbourg',
      code: 'STR',
      logoUrl: 'https://media.api-sports.io/football/teams/95.png',
    },
    {
      apiId: 82,
      name: 'Montpellier',
      code: 'MTP',
      logoUrl: 'https://media.api-sports.io/football/teams/82.png',
    },
  ],
}

// Realistic standing data per league (position, played, won, drawn, lost, gf, ga, form)
const standingsData: Record<
  string,
  Array<{
    code: string
    p: number
    w: number
    d: number
    l: number
    gf: number
    ga: number
    form: string
  }>
> = {
  'Premier League': [
    { code: 'LIV', p: 25, w: 19, d: 4, l: 2, gf: 58, ga: 18, form: 'WWDWW' },
    { code: 'ARS', p: 25, w: 17, d: 5, l: 3, gf: 52, ga: 22, form: 'WDWWW' },
    { code: 'MCI', p: 25, w: 16, d: 4, l: 5, gf: 50, ga: 28, form: 'WLWWW' },
    { code: 'CHE', p: 25, w: 14, d: 5, l: 6, gf: 45, ga: 30, form: 'DWWLW' },
    { code: 'AVL', p: 25, w: 13, d: 5, l: 7, gf: 42, ga: 32, form: 'WDLWW' },
    { code: 'NEW', p: 25, w: 12, d: 6, l: 7, gf: 38, ga: 28, form: 'DDWWL' },
    { code: 'TOT', p: 25, w: 11, d: 5, l: 9, gf: 40, ga: 35, form: 'LWDWL' },
    { code: 'MUN', p: 25, w: 10, d: 5, l: 10, gf: 33, ga: 34, form: 'WLWDL' },
    { code: 'BHA', p: 25, w: 9, d: 8, l: 8, gf: 35, ga: 35, form: 'DDDWW' },
    { code: 'WHU', p: 25, w: 8, d: 6, l: 11, gf: 30, ga: 40, form: 'LLDWL' },
  ],
  'La Liga': [
    { code: 'BAR', p: 25, w: 20, d: 3, l: 2, gf: 65, ga: 20, form: 'WWWDW' },
    { code: 'RMA', p: 25, w: 18, d: 4, l: 3, gf: 55, ga: 22, form: 'DWWWW' },
    { code: 'ATM', p: 25, w: 16, d: 5, l: 4, gf: 45, ga: 24, form: 'WDWWL' },
    { code: 'ATH', p: 25, w: 13, d: 7, l: 5, gf: 38, ga: 25, form: 'DWWDW' },
    { code: 'VIL', p: 25, w: 12, d: 6, l: 7, gf: 40, ga: 30, form: 'WLWDW' },
    { code: 'RSO', p: 25, w: 11, d: 6, l: 8, gf: 35, ga: 32, form: 'LDWWW' },
    { code: 'BET', p: 25, w: 10, d: 7, l: 8, gf: 33, ga: 30, form: 'DDWLW' },
    { code: 'SEV', p: 25, w: 9, d: 6, l: 10, gf: 30, ga: 35, form: 'WLDWL' },
    { code: 'VAL', p: 25, w: 8, d: 8, l: 9, gf: 28, ga: 32, form: 'DLDWW' },
    { code: 'CEL', p: 25, w: 7, d: 6, l: 12, gf: 25, ga: 38, form: 'LLWDL' },
  ],
  Bundesliga: [
    { code: 'B04', p: 25, w: 20, d: 4, l: 1, gf: 62, ga: 18, form: 'WWWDW' },
    { code: 'BAY', p: 25, w: 18, d: 3, l: 4, gf: 65, ga: 25, form: 'WWWLW' },
    { code: 'BVB', p: 25, w: 14, d: 5, l: 6, gf: 50, ga: 32, form: 'WDLWW' },
    { code: 'RBL', p: 25, w: 13, d: 6, l: 6, gf: 48, ga: 30, form: 'DWWWL' },
    { code: 'SGE', p: 25, w: 12, d: 5, l: 8, gf: 40, ga: 35, form: 'WLWDW' },
    { code: 'SCF', p: 25, w: 11, d: 6, l: 8, gf: 35, ga: 32, form: 'DDWWL' },
    { code: 'WOB', p: 25, w: 10, d: 7, l: 8, gf: 32, ga: 30, form: 'WDDDL' },
    { code: 'BMG', p: 25, w: 9, d: 5, l: 11, gf: 30, ga: 38, form: 'LWLWW' },
    { code: 'SVW', p: 25, w: 8, d: 6, l: 11, gf: 28, ga: 36, form: 'DLWLL' },
    { code: 'TSG', p: 25, w: 7, d: 5, l: 13, gf: 25, ga: 42, form: 'LLWDL' },
  ],
  'Serie A': [
    { code: 'INT', p: 25, w: 19, d: 4, l: 2, gf: 55, ga: 16, form: 'WWDWW' },
    { code: 'NAP', p: 25, w: 16, d: 5, l: 4, gf: 48, ga: 22, form: 'WDWWL' },
    { code: 'JUV', p: 25, w: 15, d: 6, l: 4, gf: 42, ga: 20, form: 'DDWWW' },
    { code: 'MIL', p: 25, w: 14, d: 4, l: 7, gf: 45, ga: 30, form: 'WLWWW' },
    { code: 'ATA', p: 25, w: 13, d: 5, l: 7, gf: 50, ga: 32, form: 'WWDLW' },
    { code: 'LAZ', p: 25, w: 12, d: 6, l: 7, gf: 40, ga: 30, form: 'DWWWL' },
    { code: 'ROM', p: 25, w: 11, d: 5, l: 9, gf: 35, ga: 32, form: 'LWDWW' },
    { code: 'FIO', p: 25, w: 10, d: 7, l: 8, gf: 38, ga: 35, form: 'DDWLW' },
    { code: 'TOR', p: 25, w: 9, d: 6, l: 10, gf: 30, ga: 34, form: 'WLDLL' },
    { code: 'SAS', p: 25, w: 5, d: 5, l: 15, gf: 22, ga: 48, form: 'LLLWL' },
  ],
  'Ligue 1': [
    { code: 'PSG', p: 25, w: 21, d: 2, l: 2, gf: 65, ga: 18, form: 'WWWWW' },
    { code: 'MON', p: 25, w: 15, d: 5, l: 5, gf: 48, ga: 28, form: 'WDWWL' },
    { code: 'LIL', p: 25, w: 14, d: 6, l: 5, gf: 42, ga: 25, form: 'DWWWW' },
    { code: 'OM', p: 25, w: 13, d: 5, l: 7, gf: 40, ga: 30, form: 'WLWDW' },
    { code: 'OL', p: 25, w: 12, d: 6, l: 7, gf: 38, ga: 28, form: 'DDWWW' },
    { code: 'REN', p: 25, w: 11, d: 5, l: 9, gf: 35, ga: 32, form: 'LWWDL' },
    { code: 'NIC', p: 25, w: 10, d: 7, l: 8, gf: 30, ga: 28, form: 'DDDWW' },
    { code: 'LEN', p: 25, w: 10, d: 6, l: 9, gf: 32, ga: 30, form: 'WDLWL' },
    { code: 'STR', p: 25, w: 8, d: 6, l: 11, gf: 28, ga: 36, form: 'LLWWL' },
    { code: 'MTP', p: 25, w: 5, d: 5, l: 15, gf: 20, ga: 45, form: 'LLDLL' },
  ],
  'Super Lig': [
    { code: 'GS', p: 25, w: 19, d: 3, l: 3, gf: 58, ga: 20, form: 'WWWDW' },
    { code: 'FB', p: 25, w: 18, d: 4, l: 3, gf: 55, ga: 22, form: 'DWWWW' },
    { code: 'BJK', p: 25, w: 14, d: 5, l: 6, gf: 45, ga: 28, form: 'WLWWW' },
    { code: 'TS', p: 25, w: 12, d: 6, l: 7, gf: 38, ga: 30, form: 'DWWDL' },
    { code: 'IBB', p: 25, w: 11, d: 7, l: 7, gf: 35, ga: 28, form: 'WDDWW' },
    { code: 'ADS', p: 25, w: 10, d: 5, l: 10, gf: 32, ga: 35, form: 'LWWLL' },
    { code: 'ANT', p: 25, w: 9, d: 6, l: 10, gf: 30, ga: 32, form: 'DLWWL' },
    { code: 'KON', p: 25, w: 8, d: 7, l: 10, gf: 28, ga: 30, form: 'DDDWL' },
    { code: 'SIV', p: 25, w: 7, d: 6, l: 12, gf: 25, ga: 38, form: 'LLWDL' },
    { code: 'KAS', p: 25, w: 6, d: 5, l: 14, gf: 22, ga: 42, form: 'LLDLL' },
  ],
}

function randomScore(): number {
  const weights = [0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 4]
  return weights[Math.floor(Math.random() * weights.length)]
}

function randomDate(daysAgo: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(Math.floor(Math.random() * 12) + 12, 0, 0, 0)
  return d
}

function futureDate(daysAhead: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(Math.floor(Math.random() * 12) + 12, 0, 0, 0)
  return d
}

async function main() {
  console.log('Starting database seed...')

  // Create leagues
  console.log('Creating leagues...')
  for (const league of leagues) {
    await prisma.league.upsert({
      where: { apiId: league.apiId },
      update: {
        name: league.name,
        country: league.country,
        logoUrl: league.logoUrl,
        season: currentSeason,
      },
      create: {
        apiId: league.apiId,
        name: league.name,
        country: league.country,
        logoUrl: league.logoUrl,
        season: currentSeason,
      },
    })
  }
  console.log(`  Created ${leagues.length} leagues`)

  // Create teams
  console.log('Creating teams...')
  let teamCount = 0
  for (const [leagueName, teams] of Object.entries(teamsByLeague)) {
    const league = await prisma.league.findFirst({
      where: { name: leagueName, season: currentSeason },
    })

    if (!league) continue

    for (const team of teams) {
      await prisma.team.upsert({
        where: { apiId: team.apiId },
        update: {
          name: team.name,
          code: team.code,
          logoUrl: team.logoUrl,
          country: league.country,
          leagueId: league.id,
        },
        create: {
          apiId: team.apiId,
          name: team.name,
          code: team.code,
          logoUrl: team.logoUrl,
          country: league.country,
          leagueId: league.id,
        },
      })
      teamCount++
    }
  }
  console.log(`  Created ${teamCount} teams`)

  // Create fixtures (past + future)
  console.log('Creating fixtures...')
  let fixtureApiId = 100000
  let fixtureCount = 0

  for (const [leagueName, teams] of Object.entries(teamsByLeague)) {
    const league = await prisma.league.findFirst({
      where: { name: leagueName, season: currentSeason },
    })
    if (!league) continue

    const dbTeams = await prisma.team.findMany({
      where: { leagueId: league.id },
    })
    if (dbTeams.length < 2) continue

    // Past matches (finished)
    for (let i = 0; i < dbTeams.length; i++) {
      for (let j = i + 1; j < dbTeams.length; j++) {
        const homeScore = randomScore()
        const awayScore = randomScore()
        const daysAgo = Math.floor(Math.random() * 90) + 10
        fixtureApiId++

        await prisma.fixture.upsert({
          where: { apiId: fixtureApiId },
          update: {},
          create: {
            apiId: fixtureApiId,
            matchDate: randomDate(daysAgo),
            status: 'FINISHED',
            homeScore,
            awayScore,
            round: `Matchday ${Math.ceil(Math.random() * 25)}`,
            season: currentSeason,
            leagueId: league.id,
            homeTeamId: dbTeams[i].id,
            awayTeamId: dbTeams[j].id,
          },
        })
        fixtureCount++
      }
    }

    // Future matches (scheduled)
    for (let i = 0; i < Math.min(dbTeams.length, 5); i++) {
      const awayIdx = (i + 1) % dbTeams.length
      fixtureApiId++

      await prisma.fixture.upsert({
        where: { apiId: fixtureApiId },
        update: {},
        create: {
          apiId: fixtureApiId,
          matchDate: futureDate(Math.floor(Math.random() * 14) + 1),
          status: 'SCHEDULED',
          round: `Matchday ${26 + i}`,
          season: currentSeason,
          leagueId: league.id,
          homeTeamId: dbTeams[i].id,
          awayTeamId: dbTeams[awayIdx].id,
        },
      })
      fixtureCount++
    }
  }
  console.log(`  Created ${fixtureCount} fixtures`)

  // Create standings
  console.log('Creating standings...')
  let standingCount = 0
  for (const [leagueName, rows] of Object.entries(standingsData)) {
    const league = await prisma.league.findFirst({
      where: { name: leagueName, season: currentSeason },
    })
    if (!league) continue

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const team = await prisma.team.findFirst({
        where: { code: row.code, leagueId: league.id },
      })
      if (!team) continue

      const gd = row.gf - row.ga
      const pts = row.w * 3 + row.d

      await prisma.standing.upsert({
        where: {
          leagueId_teamId_season: {
            leagueId: league.id,
            teamId: team.id,
            season: currentSeason,
          },
        },
        update: {
          position: i + 1,
          played: row.p,
          won: row.w,
          drawn: row.d,
          lost: row.l,
          goalsFor: row.gf,
          goalsAgainst: row.ga,
          goalDifference: gd,
          points: pts,
          form: row.form,
        },
        create: {
          leagueId: league.id,
          teamId: team.id,
          season: currentSeason,
          position: i + 1,
          played: row.p,
          won: row.w,
          drawn: row.d,
          lost: row.l,
          goalsFor: row.gf,
          goalsAgainst: row.ga,
          goalDifference: gd,
          points: pts,
          form: row.form,
        },
      })
      standingCount++
    }
  }
  console.log(`  Created ${standingCount} standings`)

  // Create TeamStats
  console.log('Creating team stats...')
  let statsCount = 0
  for (const [leagueName, rows] of Object.entries(standingsData)) {
    const league = await prisma.league.findFirst({
      where: { name: leagueName, season: currentSeason },
    })
    if (!league) continue

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const team = await prisma.team.findFirst({
        where: { code: row.code, leagueId: league.id },
      })
      if (!team) continue

      await prisma.teamStats.upsert({
        where: {
          teamId_season: {
            teamId: team.id,
            season: currentSeason,
          },
        },
        update: {},
        create: {
          teamId: team.id,
          leagueId: league.id,
          season: currentSeason,
          matchesPlayed: row.p,
          wins: row.w,
          draws: row.d,
          losses: row.l,
          goalsFor: row.gf,
          goalsAgainst: row.ga,
          cleanSheets: Math.floor(row.w * 0.4),
          homeWins: Math.floor(row.w * 0.6),
          awayWins: Math.floor(row.w * 0.4),
          lastFiveForm: row.form,
          leaguePosition: i + 1,
          points: row.w * 3 + row.d,
        },
      })
      statsCount++
    }
  }
  console.log(`  Created ${statsCount} team stats`)

  // Create H2H records
  console.log('Creating H2H records...')
  let h2hCount = 0
  const h2hPairs: Array<{ league: string; team1: string; team2: string }> = [
    { league: 'Premier League', team1: 'LIV', team2: 'MUN' },
    { league: 'Premier League', team1: 'ARS', team2: 'TOT' },
    { league: 'Premier League', team1: 'MCI', team2: 'LIV' },
    { league: 'La Liga', team1: 'BAR', team2: 'RMA' },
    { league: 'La Liga', team1: 'ATM', team2: 'BAR' },
    { league: 'Bundesliga', team1: 'BAY', team2: 'BVB' },
    { league: 'Serie A', team1: 'INT', team2: 'MIL' },
    { league: 'Serie A', team1: 'JUV', team2: 'INT' },
    { league: 'Ligue 1', team1: 'PSG', team2: 'OM' },
    { league: 'Super Lig', team1: 'GS', team2: 'FB' },
    { league: 'Super Lig', team1: 'GS', team2: 'BJK' },
    { league: 'Super Lig', team1: 'FB', team2: 'BJK' },
  ]

  for (const pair of h2hPairs) {
    const league = await prisma.league.findFirst({
      where: { name: pair.league, season: currentSeason },
    })
    if (!league) continue

    const team1 = await prisma.team.findFirst({
      where: { code: pair.team1, leagueId: league.id },
    })
    const team2 = await prisma.team.findFirst({
      where: { code: pair.team2, leagueId: league.id },
    })
    if (!team1 || !team2) continue

    const t1w = Math.floor(Math.random() * 8) + 3
    const t2w = Math.floor(Math.random() * 8) + 3
    const dr = Math.floor(Math.random() * 5) + 2

    await prisma.h2HRecord.upsert({
      where: {
        team1Id_team2Id: { team1Id: team1.id, team2Id: team2.id },
      },
      update: {},
      create: {
        team1Id: team1.id,
        team2Id: team2.id,
        team1Wins: t1w,
        team2Wins: t2w,
        draws: dr,
        totalGames: t1w + t2w + dr,
        lastFive: [
          {
            home: team1.name,
            away: team2.name,
            score: '2-1',
            date: '2024-10-15',
          },
          {
            home: team2.name,
            away: team1.name,
            score: '1-1',
            date: '2024-05-20',
          },
          {
            home: team1.name,
            away: team2.name,
            score: '0-1',
            date: '2024-01-10',
          },
          {
            home: team2.name,
            away: team1.name,
            score: '3-2',
            date: '2023-09-25',
          },
          {
            home: team1.name,
            away: team2.name,
            score: '1-0',
            date: '2023-04-12',
          },
        ],
      },
    })
    h2hCount++
  }
  console.log(`  Created ${h2hCount} H2H records`)

  // Create test users
  console.log('Creating test users...')
  const passwordHash = await bcrypt.hash('Test1234!', 12)

  await prisma.user.upsert({
    where: { email: 'admin@footballai.io' },
    update: {},
    create: {
      email: 'admin@footballai.io',
      passwordHash,
      fullName: 'Admin User',
      isAdmin: true,
      emailVerified: true,
      preferredLang: 'tr',
      theme: 'dark',
    },
  })

  const normalUser = await prisma.user.upsert({
    where: { email: 'demo@footballai.io' },
    update: {},
    create: {
      email: 'demo@footballai.io',
      passwordHash,
      fullName: 'Demo User',
      isAdmin: false,
      emailVerified: true,
      preferredLang: 'en',
      theme: 'dark',
    },
  })
  console.log('  Created 2 test users (admin + demo)')

  // Create sample predictions
  console.log('Creating sample predictions...')
  const sampleFixtures = await prisma.fixture.findMany({
    where: { status: 'SCHEDULED' },
    take: 5,
  })

  let predictionCount = 0
  for (const fixture of sampleFixtures) {
    const hwp = Math.random() * 0.5 + 0.2
    const dp = Math.random() * 0.3
    const awp = 1 - hwp - dp

    await prisma.prediction.upsert({
      where: {
        fixtureId_modelVersion: {
          fixtureId: fixture.id,
          modelVersion: 'ensemble-v1',
        },
      },
      update: {},
      create: {
        fixtureId: fixture.id,
        modelVersion: 'ensemble-v1',
        homeWinProb: Math.round(hwp * 100),
        drawProb: Math.round(dp * 100),
        awayWinProb: Math.round(awp * 100),
        predictedHomeScore: Math.round(Math.random() * 2 + 0.5),
        predictedAwayScore: Math.round(Math.random() * 1.5 + 0.3),
        confidence: Math.round(Math.max(hwp, dp, awp) * 100),
        features: { model: 'poisson+xgboost', features_used: 15 },
        explanation:
          'Based on team form, H2H records, and league position analysis.',
        keyFactors: ['Home advantage', 'Recent form', 'Goal scoring record'],
      },
    })
    predictionCount++
  }
  console.log(`  Created ${predictionCount} predictions`)

  // Create sample notifications
  console.log('Creating sample notifications...')
  await prisma.notification.createMany({
    data: [
      {
        userId: normalUser.id,
        type: 'MATCH_START',
        title: 'Match Starting',
        message: 'Liverpool vs Arsenal is about to start!',
        metadata: {},
      },
      {
        userId: normalUser.id,
        type: 'HIGH_CONFIDENCE',
        title: 'High Confidence Prediction',
        message:
          'Our AI model has 85% confidence for Barcelona vs Real Madrid.',
        metadata: {},
      },
      {
        userId: normalUser.id,
        type: 'PREDICTION_RESULT',
        title: 'Prediction Result',
        message: 'Your prediction for Galatasaray vs Fenerbahce was correct!',
        isRead: true,
        metadata: {},
      },
    ],
    skipDuplicates: true,
  })
  console.log('  Created 3 notifications')

  // Summary
  const counts = {
    leagues: await prisma.league.count(),
    teams: await prisma.team.count(),
    fixtures: await prisma.fixture.count(),
    standings: await prisma.standing.count(),
    teamStats: await prisma.teamStats.count(),
    h2hRecords: await prisma.h2HRecord.count(),
    users: await prisma.user.count(),
    predictions: await prisma.prediction.count(),
    notifications: await prisma.notification.count(),
  }

  console.log('\nSeed Summary:')
  for (const [key, count] of Object.entries(counts)) {
    console.log(`  ${key}: ${count}`)
  }
  console.log('\nDatabase seeded successfully!')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
