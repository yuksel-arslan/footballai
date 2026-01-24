import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const currentSeason = 2024

// League data with API-Football IDs
const leagues = [
  // Turkey
  { apiId: 203, name: 'Süper Lig', country: 'Turkey', logoUrl: 'https://media.api-sports.io/football/leagues/203.png' },

  // England
  { apiId: 39, name: 'Premier League', country: 'England', logoUrl: 'https://media.api-sports.io/football/leagues/39.png' },
  { apiId: 40, name: 'Championship', country: 'England', logoUrl: 'https://media.api-sports.io/football/leagues/40.png' },

  // Spain
  { apiId: 140, name: 'La Liga', country: 'Spain', logoUrl: 'https://media.api-sports.io/football/leagues/140.png' },

  // Germany
  { apiId: 78, name: 'Bundesliga', country: 'Germany', logoUrl: 'https://media.api-sports.io/football/leagues/78.png' },

  // Italy
  { apiId: 135, name: 'Serie A', country: 'Italy', logoUrl: 'https://media.api-sports.io/football/leagues/135.png' },

  // France
  { apiId: 61, name: 'Ligue 1', country: 'France', logoUrl: 'https://media.api-sports.io/football/leagues/61.png' },

  // European Competitions
  { apiId: 2, name: 'UEFA Champions League', country: 'Europe', logoUrl: 'https://media.api-sports.io/football/leagues/2.png' },
  { apiId: 3, name: 'UEFA Europa League', country: 'Europe', logoUrl: 'https://media.api-sports.io/football/leagues/3.png' },
  { apiId: 848, name: 'UEFA Conference League', country: 'Europe', logoUrl: 'https://media.api-sports.io/football/leagues/848.png' },
]

// Teams by league
const teamsByLeague: Record<string, Array<{ apiId: number; name: string; code: string; logoUrl: string }>> = {
  'Süper Lig': [
    { apiId: 645, name: 'Galatasaray', code: 'GS', logoUrl: 'https://media.api-sports.io/football/teams/645.png' },
    { apiId: 611, name: 'Fenerbahçe', code: 'FB', logoUrl: 'https://media.api-sports.io/football/teams/611.png' },
    { apiId: 549, name: 'Beşiktaş', code: 'BJK', logoUrl: 'https://media.api-sports.io/football/teams/549.png' },
    { apiId: 3563, name: 'Trabzonspor', code: 'TS', logoUrl: 'https://media.api-sports.io/football/teams/3563.png' },
    { apiId: 3589, name: 'Başakşehir', code: 'IBB', logoUrl: 'https://media.api-sports.io/football/teams/3589.png' },
    { apiId: 607, name: 'Adana Demirspor', code: 'ADS', logoUrl: 'https://media.api-sports.io/football/teams/607.png' },
    { apiId: 3573, name: 'Antalyaspor', code: 'ANT', logoUrl: 'https://media.api-sports.io/football/teams/3573.png' },
    { apiId: 3564, name: 'Konyaspor', code: 'KON', logoUrl: 'https://media.api-sports.io/football/teams/3564.png' },
    { apiId: 3569, name: 'Sivasspor', code: 'SIV', logoUrl: 'https://media.api-sports.io/football/teams/3569.png' },
    { apiId: 3574, name: 'Kasımpaşa', code: 'KAS', logoUrl: 'https://media.api-sports.io/football/teams/3574.png' },
  ],

  'Premier League': [
    { apiId: 33, name: 'Manchester United', code: 'MUN', logoUrl: 'https://media.api-sports.io/football/teams/33.png' },
    { apiId: 34, name: 'Newcastle United', code: 'NEW', logoUrl: 'https://media.api-sports.io/football/teams/34.png' },
    { apiId: 40, name: 'Liverpool', code: 'LIV', logoUrl: 'https://media.api-sports.io/football/teams/40.png' },
    { apiId: 42, name: 'Arsenal', code: 'ARS', logoUrl: 'https://media.api-sports.io/football/teams/42.png' },
    { apiId: 47, name: 'Tottenham', code: 'TOT', logoUrl: 'https://media.api-sports.io/football/teams/47.png' },
    { apiId: 49, name: 'Chelsea', code: 'CHE', logoUrl: 'https://media.api-sports.io/football/teams/49.png' },
    { apiId: 50, name: 'Manchester City', code: 'MCI', logoUrl: 'https://media.api-sports.io/football/teams/50.png' },
    { apiId: 66, name: 'Aston Villa', code: 'AVL', logoUrl: 'https://media.api-sports.io/football/teams/66.png' },
    { apiId: 52, name: 'West Ham', code: 'WHU', logoUrl: 'https://media.api-sports.io/football/teams/52.png' },
    { apiId: 51, name: 'Brighton', code: 'BHA', logoUrl: 'https://media.api-sports.io/football/teams/51.png' },
  ],

  'La Liga': [
    { apiId: 529, name: 'Barcelona', code: 'BAR', logoUrl: 'https://media.api-sports.io/football/teams/529.png' },
    { apiId: 541, name: 'Real Madrid', code: 'RMA', logoUrl: 'https://media.api-sports.io/football/teams/541.png' },
    { apiId: 530, name: 'Atletico Madrid', code: 'ATM', logoUrl: 'https://media.api-sports.io/football/teams/530.png' },
    { apiId: 536, name: 'Sevilla', code: 'SEV', logoUrl: 'https://media.api-sports.io/football/teams/536.png' },
    { apiId: 533, name: 'Villarreal', code: 'VIL', logoUrl: 'https://media.api-sports.io/football/teams/533.png' },
    { apiId: 548, name: 'Real Sociedad', code: 'RSO', logoUrl: 'https://media.api-sports.io/football/teams/548.png' },
    { apiId: 531, name: 'Athletic Bilbao', code: 'ATH', logoUrl: 'https://media.api-sports.io/football/teams/531.png' },
    { apiId: 532, name: 'Valencia', code: 'VAL', logoUrl: 'https://media.api-sports.io/football/teams/532.png' },
    { apiId: 543, name: 'Real Betis', code: 'BET', logoUrl: 'https://media.api-sports.io/football/teams/543.png' },
    { apiId: 546, name: 'Celta Vigo', code: 'CEL', logoUrl: 'https://media.api-sports.io/football/teams/546.png' },
  ],

  'Bundesliga': [
    { apiId: 157, name: 'Bayern Munich', code: 'BAY', logoUrl: 'https://media.api-sports.io/football/teams/157.png' },
    { apiId: 165, name: 'Borussia Dortmund', code: 'BVB', logoUrl: 'https://media.api-sports.io/football/teams/165.png' },
    { apiId: 173, name: 'RB Leipzig', code: 'RBL', logoUrl: 'https://media.api-sports.io/football/teams/173.png' },
    { apiId: 168, name: 'Bayer Leverkusen', code: 'B04', logoUrl: 'https://media.api-sports.io/football/teams/168.png' },
    { apiId: 169, name: 'Eintracht Frankfurt', code: 'SGE', logoUrl: 'https://media.api-sports.io/football/teams/169.png' },
    { apiId: 161, name: 'VfL Wolfsburg', code: 'WOB', logoUrl: 'https://media.api-sports.io/football/teams/161.png' },
    { apiId: 163, name: 'Borussia Mönchengladbach', code: 'BMG', logoUrl: 'https://media.api-sports.io/football/teams/163.png' },
    { apiId: 160, name: 'SC Freiburg', code: 'SCF', logoUrl: 'https://media.api-sports.io/football/teams/160.png' },
    { apiId: 162, name: 'Werder Bremen', code: 'SVW', logoUrl: 'https://media.api-sports.io/football/teams/162.png' },
    { apiId: 167, name: '1899 Hoffenheim', code: 'TSG', logoUrl: 'https://media.api-sports.io/football/teams/167.png' },
  ],

  'Serie A': [
    { apiId: 489, name: 'AC Milan', code: 'MIL', logoUrl: 'https://media.api-sports.io/football/teams/489.png' },
    { apiId: 505, name: 'Inter Milan', code: 'INT', logoUrl: 'https://media.api-sports.io/football/teams/505.png' },
    { apiId: 496, name: 'Juventus', code: 'JUV', logoUrl: 'https://media.api-sports.io/football/teams/496.png' },
    { apiId: 492, name: 'Napoli', code: 'NAP', logoUrl: 'https://media.api-sports.io/football/teams/492.png' },
    { apiId: 497, name: 'AS Roma', code: 'ROM', logoUrl: 'https://media.api-sports.io/football/teams/497.png' },
    { apiId: 487, name: 'Lazio', code: 'LAZ', logoUrl: 'https://media.api-sports.io/football/teams/487.png' },
    { apiId: 499, name: 'Atalanta', code: 'ATA', logoUrl: 'https://media.api-sports.io/football/teams/499.png' },
    { apiId: 502, name: 'Fiorentina', code: 'FIO', logoUrl: 'https://media.api-sports.io/football/teams/502.png' },
    { apiId: 503, name: 'Torino', code: 'TOR', logoUrl: 'https://media.api-sports.io/football/teams/503.png' },
    { apiId: 488, name: 'Sassuolo', code: 'SAS', logoUrl: 'https://media.api-sports.io/football/teams/488.png' },
  ],

  'Ligue 1': [
    { apiId: 85, name: 'Paris Saint-Germain', code: 'PSG', logoUrl: 'https://media.api-sports.io/football/teams/85.png' },
    { apiId: 81, name: 'Marseille', code: 'OM', logoUrl: 'https://media.api-sports.io/football/teams/81.png' },
    { apiId: 80, name: 'Lyon', code: 'OL', logoUrl: 'https://media.api-sports.io/football/teams/80.png' },
    { apiId: 91, name: 'Monaco', code: 'MON', logoUrl: 'https://media.api-sports.io/football/teams/91.png' },
    { apiId: 79, name: 'Lille', code: 'LIL', logoUrl: 'https://media.api-sports.io/football/teams/79.png' },
    { apiId: 94, name: 'Rennes', code: 'REN', logoUrl: 'https://media.api-sports.io/football/teams/94.png' },
    { apiId: 84, name: 'Nice', code: 'NIC', logoUrl: 'https://media.api-sports.io/football/teams/84.png' },
    { apiId: 93, name: 'Lens', code: 'LEN', logoUrl: 'https://media.api-sports.io/football/teams/93.png' },
    { apiId: 95, name: 'Strasbourg', code: 'STR', logoUrl: 'https://media.api-sports.io/football/teams/95.png' },
    { apiId: 82, name: 'Montpellier', code: 'MTP', logoUrl: 'https://media.api-sports.io/football/teams/82.png' },
  ],
}

async function main() {
  console.log('🌱 Starting database seed...')

  // Create leagues
  console.log('📋 Creating leagues...')
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
    console.log(`  ✅ ${league.name}`)
  }

  // Create teams
  console.log('\n⚽ Creating teams...')
  for (const [leagueName, teams] of Object.entries(teamsByLeague)) {
    const league = await prisma.league.findFirst({
      where: { name: leagueName, season: currentSeason },
    })

    if (!league) {
      console.log(`  ⚠️ League not found: ${leagueName}`)
      continue
    }

    console.log(`\n  📁 ${leagueName}:`)
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
      console.log(`    ✅ ${team.name}`)
    }
  }

  // Summary
  const leagueCount = await prisma.league.count()
  const teamCount = await prisma.team.count()

  console.log('\n📊 Seed Summary:')
  console.log(`  - Leagues: ${leagueCount}`)
  console.log(`  - Teams: ${teamCount}`)
  console.log('\n✨ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
