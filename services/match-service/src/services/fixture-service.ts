import { prisma } from '@football-ai/database'
import { apiFootballClient } from './api-football'
import { cache } from './cache'
import { config } from '@/config'

class FixtureService {
  // Get upcoming fixtures
  async getUpcomingFixtures(params: {
    date?: string
    league?: number
    team?: number
    limit?: number
    offset?: number
  }) {
    const cacheKey = cache.key('fixtures:upcoming', JSON.stringify(params))
    
    // Try cache first
    const cached = await cache.get(cacheKey)
    if (cached) {
      console.log('📦 Cache hit: upcoming fixtures')
      return cached
    }

    // Query database
    const where: any = {
      status: 'SCHEDULED',
      matchDate: {
        gte: new Date(),
      },
    }

    if (params.league) {
      where.leagueId = params.league
    }

    if (params.team) {
      where.OR = [
        { homeTeamId: params.team },
        { awayTeamId: params.team },
      ]
    }

    const fixtures = await prisma.fixture.findMany({
      where,
      include: {
        homeTeam: true,
        awayTeam: true,
        league: true,
      },
      orderBy: {
        matchDate: 'asc',
      },
      take: params.limit || 20,
      skip: params.offset || 0,
    })

    // Cache result
    await cache.set(cacheKey, fixtures, config.cache.upcomingFixtures)

    return fixtures
  }

  // Get live fixtures
  async getLiveFixtures() {
    const cacheKey = cache.key('fixtures:live')
    
    const cached = await cache.get(cacheKey)
    if (cached) {
      console.log('📦 Cache hit: live fixtures')
      return cached
    }

    const fixtures = await prisma.fixture.findMany({
      where: {
        status: { in: ['LIVE', 'HALFTIME'] },
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        league: true,
        liveScore: true,
      },
      orderBy: {
        matchDate: 'desc',
      },
    })

    await cache.set(cacheKey, fixtures, config.cache.liveScores)

    return fixtures
  }

  // Get fixture by ID
  async getFixtureById(id: number) {
    const cacheKey = cache.key('fixture', id)
    
    const cached = await cache.get(cacheKey)
    if (cached) {
      console.log('📦 Cache hit: fixture', id)
      return cached
    }

    const fixture = await prisma.fixture.findUnique({
      where: { id },
      include: {
        homeTeam: true,
        awayTeam: true,
        league: true,
        liveScore: true,
        predictions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    })

    if (fixture) {
      await cache.set(cacheKey, fixture, config.cache.upcomingFixtures)
    }

    return fixture
  }

  // Sync fixtures from API Football
  async syncFixtures(params: { date?: string; league?: number }) {
    console.log('🔄 Syncing fixtures from API Football...')

    const apiParams: any = {
      date: params.date || new Date().toISOString().split('T')[0],
    }

    if (params.league) {
      apiParams.league = params.league
      apiParams.season = new Date().getFullYear()
    }

    const response = await apiFootballClient.getFixtures(apiParams)
    const apiFixtures = response.response || []

    let synced = 0
    let updated = 0

    for (const apiFixture of apiFixtures) {
      try {
        // Check if fixture exists
        const existing = await prisma.fixture.findUnique({
          where: { apiId: apiFixture.fixture.id },
        })

        if (existing) {
          // Update existing
          await prisma.fixture.update({
            where: { apiId: apiFixture.fixture.id },
            data: {
              status: this.mapStatus(apiFixture.fixture.status.short),
              homeScore: apiFixture.goals.home,
              awayScore: apiFixture.goals.away,
              minute: apiFixture.fixture.status.elapsed,
            },
          })
          updated++
        } else {
          // Create new
          await this.createFixtureFromApi(apiFixture)
          synced++
        }
      } catch (error) {
        console.error('Error syncing fixture:', error)
      }
    }

    console.log(`✅ Synced ${synced} new fixtures, updated ${updated}`)

    // Clear cache
    await cache.clear('fixtures:*')

    return { synced, updated }
  }

  // Helper: Create fixture from API data
  private async createFixtureFromApi(apiFixture: any) {
    // Ensure teams exist
    const homeTeam = await this.ensureTeam(apiFixture.teams.home)
    const awayTeam = await this.ensureTeam(apiFixture.teams.away)
    const league = await this.ensureLeague(apiFixture.league)

    return prisma.fixture.create({
      data: {
        apiId: apiFixture.fixture.id,
        matchDate: new Date(apiFixture.fixture.date),
        status: this.mapStatus(apiFixture.fixture.status.short),
        homeScore: apiFixture.goals.home,
        awayScore: apiFixture.goals.away,
        venue: apiFixture.fixture.venue.name,
        referee: apiFixture.fixture.referee,
        round: apiFixture.league.round,
        season: apiFixture.league.season,
        minute: apiFixture.fixture.status.elapsed,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        leagueId: league.id,
      },
    })
  }

  // Helper: Ensure team exists
  private async ensureTeam(apiTeam: any) {
    const existing = await prisma.team.findUnique({
      where: { apiId: apiTeam.id },
    })

    if (existing) return existing

    return prisma.team.create({
      data: {
        apiId: apiTeam.id,
        name: apiTeam.name,
        logoUrl: apiTeam.logo,
        country: 'Unknown', // Will be updated later
      },
    })
  }

  // Helper: Ensure league exists
  private async ensureLeague(apiLeague: any) {
    const existing = await prisma.league.findFirst({
      where: {
        apiId: apiLeague.id,
        season: apiLeague.season,
      },
    })

    if (existing) return existing

    return prisma.league.create({
      data: {
        apiId: apiLeague.id,
        name: apiLeague.name,
        country: apiLeague.country,
        logoUrl: apiLeague.logo,
        season: apiLeague.season,
      },
    })
  }

  // Helper: Map API status to our enum
  private mapStatus(apiStatus: string): any {
    const statusMap: Record<string, string> = {
      'TBD': 'SCHEDULED',
      'NS': 'SCHEDULED',
      '1H': 'LIVE',
      'HT': 'HALFTIME',
      '2H': 'LIVE',
      'ET': 'LIVE',
      'P': 'LIVE',
      'FT': 'FINISHED',
      'AET': 'FINISHED',
      'PEN': 'FINISHED',
      'PST': 'POSTPONED',
      'CANC': 'CANCELLED',
      'ABD': 'CANCELLED',
      'AWD': 'FINISHED',
      'WO': 'FINISHED',
    }

    return statusMap[apiStatus] || 'SCHEDULED'
  }
}

export const fixtureService = new FixtureService()
