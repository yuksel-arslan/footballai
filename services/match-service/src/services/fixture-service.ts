import { prisma } from '@football-ai/database'
import { apiFootballClient } from './api-football'
import { cache } from './cache'
import { config } from '../config'
import { logger } from '../lib/logger'

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
      logger.debug('Cache hit: upcoming fixtures')
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
      where.OR = [{ homeTeamId: params.team }, { awayTeamId: params.team }]
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
      logger.debug('Cache hit: live fixtures')
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

  // Get finished fixtures
  async getFinishedFixtures(params: {
    date?: string
    league?: number
    limit?: number
    offset?: number
  }) {
    const cacheKey = cache.key('fixtures:finished', JSON.stringify(params))

    const cached = await cache.get(cacheKey)
    if (cached) return cached

    const where: any = {
      status: 'FINISHED',
    }

    if (params.date) {
      const date = new Date(params.date)
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      where.matchDate = { gte: date, lt: nextDay }
    }

    if (params.league) {
      where.leagueId = params.league
    }

    const fixtures = await prisma.fixture.findMany({
      where,
      include: {
        homeTeam: true,
        awayTeam: true,
        league: true,
      },
      orderBy: { matchDate: 'desc' },
      take: params.limit || 20,
      skip: params.offset || 0,
    })

    await cache.set(cacheKey, fixtures, config.cache.upcomingFixtures)
    return fixtures
  }

  // Get fixture by ID
  async getFixtureById(id: number) {
    const cacheKey = cache.key('fixture', id)

    const cached = await cache.get(cacheKey)
    if (cached) {
      logger.debug({ fixtureId: id }, 'Cache hit: fixture')
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
    logger.info('Syncing fixtures from API Football...')

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
        logger.error({ error }, 'Error syncing fixture')
      }
    }

    logger.info(
      { synced, updated },
      `Synced ${synced} new fixtures, updated ${updated}`
    )

    // Clear cache
    await cache.clear('fixtures:*')

    return { synced, updated }
  }

  // Backfill historical FINISHED fixtures (with scores) for a league/season so
  // the Dixon-Coles engine has data to fit on. Pulls the whole season from
  // API-Football and upserts; finished matches land as status=FINISHED.
  async backfillFinished(params: { league: number; season?: number }) {
    const season = params.season ?? this.currentSeason()
    logger.info(
      { league: params.league, season },
      'Backfilling finished fixtures...'
    )

    const response = await apiFootballClient.getFixtures({
      league: params.league,
      season,
    })
    const apiFixtures = (response.response || []) as any[]

    let created = 0
    let updated = 0
    let finished = 0

    for (const apiFixture of apiFixtures) {
      try {
        const isFinished =
          this.mapStatus(apiFixture.fixture.status.short) === 'FINISHED'
        const result = await this.upsertFixtureFromApi(apiFixture)
        if (result === 'created') created++
        else updated++
        if (isFinished) finished++
      } catch (error) {
        logger.error({ error }, 'Error backfilling fixture')
      }
    }

    await cache.clear('fixtures:*')
    logger.info(
      { league: params.league, season, created, updated, finished },
      'Backfill complete'
    )
    return {
      league: params.league,
      season,
      total: apiFixtures.length,
      created,
      updated,
      finished,
    }
  }

  // Helper: upsert a single API fixture (create new or refresh status/score).
  private async upsertFixtureFromApi(
    apiFixture: any
  ): Promise<'created' | 'updated'> {
    const existing = await prisma.fixture.findUnique({
      where: { apiId: apiFixture.fixture.id },
    })
    if (existing) {
      await prisma.fixture.update({
        where: { apiId: apiFixture.fixture.id },
        data: {
          status: this.mapStatus(apiFixture.fixture.status.short),
          homeScore: apiFixture.goals.home,
          awayScore: apiFixture.goals.away,
          minute: apiFixture.fixture.status.elapsed,
        },
      })
      return 'updated'
    }
    await this.createFixtureFromApi(apiFixture)
    return 'created'
  }

  // Football seasons span Aug→May; before July belongs to the previous year.
  private currentSeason(): number {
    const now = new Date()
    return now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear()
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

  // Sync fixtures from all configured providers
  async syncFromProviders() {
    logger.info('Syncing fixtures from providers...')
    try {
      await this.syncFixtures({})
    } catch (error) {
      logger.error({ error }, 'Failed to sync fixtures from providers')
    }
  }

  // Sync standings from Football-Data.org into Standing model
  async syncStandings() {
    const competitionCodes = ['PL', 'PD', 'BL1', 'SA', 'FL1']
    const season = new Date().getFullYear()
    let totalSynced = 0

    for (const code of competitionCodes) {
      try {
        const { footballDataClient } = await import('./football-data')
        const response = await footballDataClient.getStandings(code)
        const table = response.standings?.[0]?.table || []

        if (table.length === 0) continue

        // Find or skip league
        const league = await prisma.league.findFirst({
          where: {
            name: {
              contains: response.competition?.name || code,
              mode: 'insensitive',
            },
          },
        })

        if (!league) {
          logger.debug({ code }, 'League not found in DB for standings sync')
          continue
        }

        for (const entry of table) {
          const team = await prisma.team.findFirst({
            where: {
              OR: [
                { apiId: entry.team?.id || 0 },
                {
                  name: { equals: entry.team?.name || '', mode: 'insensitive' },
                },
              ],
            },
          })

          if (!team) continue

          await prisma.standing.upsert({
            where: {
              leagueId_teamId_season: {
                leagueId: league.id,
                teamId: team.id,
                season,
              },
            },
            update: {
              position: entry.position || 0,
              played: entry.playedGames || 0,
              won: entry.won || 0,
              drawn: entry.draw || 0,
              lost: entry.lost || 0,
              goalsFor: entry.goalsFor || 0,
              goalsAgainst: entry.goalsAgainst || 0,
              goalDifference: entry.goalDifference || 0,
              points: entry.points || 0,
              form: entry.form || null,
            },
            create: {
              leagueId: league.id,
              teamId: team.id,
              season,
              position: entry.position || 0,
              played: entry.playedGames || 0,
              won: entry.won || 0,
              drawn: entry.draw || 0,
              lost: entry.lost || 0,
              goalsFor: entry.goalsFor || 0,
              goalsAgainst: entry.goalsAgainst || 0,
              goalDifference: entry.goalDifference || 0,
              points: entry.points || 0,
              form: entry.form || null,
            },
          })
          totalSynced++
        }

        logger.info(
          { code, count: table.length },
          `Synced standings for ${code}`
        )
      } catch (error) {
        logger.error({ error, code }, `Failed to sync standings for ${code}`)
      }
    }

    // Clear standings cache
    await cache.clear('stats:standings:*')

    logger.info({ totalSynced }, 'Standings sync complete')
    return { synced: totalSynced }
  }

  // Helper: Map API status to our enum
  private mapStatus(apiStatus: string): any {
    const statusMap: Record<string, string> = {
      TBD: 'SCHEDULED',
      NS: 'SCHEDULED',
      '1H': 'LIVE',
      HT: 'HALFTIME',
      '2H': 'LIVE',
      ET: 'LIVE',
      P: 'LIVE',
      FT: 'FINISHED',
      AET: 'FINISHED',
      PEN: 'FINISHED',
      PST: 'POSTPONED',
      CANC: 'CANCELLED',
      ABD: 'CANCELLED',
      AWD: 'FINISHED',
      WO: 'FINISHED',
    }

    return statusMap[apiStatus] || 'SCHEDULED'
  }
}

export const fixtureService = new FixtureService()
