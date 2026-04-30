import { Router, type Router as RouterType } from 'express'
import { prisma } from '@football-ai/database'
import { fixtureController } from '../controllers/fixture-controller'
import { asyncHandler } from '../middleware/async-handler'

const router: RouterType = Router()

/**
 * @openapi
 * /api/fixtures/training-data:
 *   get:
 *     summary: Export ML training data
 *     tags: [Fixtures]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 500
 *     responses:
 *       200:
 *         description: Training data for ML models
 */
router.get(
  '/training-data',
  asyncHandler(async (req, res) => {
    const limit = parseInt(String(req.query.limit || '500'))

    const fixtures = await prisma.fixture.findMany({
      where: { status: 'FINISHED' },
      include: {
        homeTeam: true,
        awayTeam: true,
        league: true,
      },
      orderBy: { matchDate: 'desc' },
      take: limit,
    })

    const trainingData = await Promise.all(
      fixtures.map(async (f) => {
        // Fetch team stats for the fixture season
        const [homeStats, awayStats] = await Promise.all([
          prisma.teamStats.findFirst({
            where: { teamId: f.homeTeamId, season: f.season },
          }),
          prisma.teamStats.findFirst({
            where: { teamId: f.awayTeamId, season: f.season },
          }),
        ])

        // Fetch H2H record
        const h2h = await prisma.h2HRecord.findFirst({
          where: {
            OR: [
              { team1Id: f.homeTeamId, team2Id: f.awayTeamId },
              { team1Id: f.awayTeamId, team2Id: f.homeTeamId },
            ],
          },
        })

        const homeIsTeam1 = h2h ? h2h.team1Id === f.homeTeamId : true

        return {
          fixture_id: f.id,
          home_team: {
            team_id: f.homeTeam.id,
            name: f.homeTeam.name,
            matches_played: homeStats?.matchesPlayed ?? 0,
            wins: homeStats?.wins ?? 0,
            draws: homeStats?.draws ?? 0,
            losses: homeStats?.losses ?? 0,
            goals_for: homeStats?.goalsFor ?? 0,
            goals_against: homeStats?.goalsAgainst ?? 0,
            home_wins: homeStats?.homeWins ?? 0,
            away_wins: homeStats?.awayWins ?? 0,
            clean_sheets: homeStats?.cleanSheets ?? 0,
            points: homeStats?.points ?? 0,
            last_five_form: homeStats?.lastFiveForm ?? null,
            league_position: homeStats?.leaguePosition ?? null,
          },
          away_team: {
            team_id: f.awayTeam.id,
            name: f.awayTeam.name,
            matches_played: awayStats?.matchesPlayed ?? 0,
            wins: awayStats?.wins ?? 0,
            draws: awayStats?.draws ?? 0,
            losses: awayStats?.losses ?? 0,
            goals_for: awayStats?.goalsFor ?? 0,
            goals_against: awayStats?.goalsAgainst ?? 0,
            home_wins: awayStats?.homeWins ?? 0,
            away_wins: awayStats?.awayWins ?? 0,
            clean_sheets: awayStats?.cleanSheets ?? 0,
            points: awayStats?.points ?? 0,
            last_five_form: awayStats?.lastFiveForm ?? null,
            league_position: awayStats?.leaguePosition ?? null,
          },
          h2h: {
            home_wins: h2h ? (homeIsTeam1 ? h2h.team1Wins : h2h.team2Wins) : 0,
            away_wins: h2h ? (homeIsTeam1 ? h2h.team2Wins : h2h.team1Wins) : 0,
            draws: h2h?.draws ?? 0,
            total_games: h2h?.totalGames ?? 0,
          },
          result:
            f.homeScore! > f.awayScore!
              ? 0
              : f.homeScore === f.awayScore
                ? 1
                : 2,
          home_score: f.homeScore,
          away_score: f.awayScore,
        }
      })
    )

    res.json({ success: true, data: trainingData, count: trainingData.length })
  })
)

/**
 * @openapi
 * /api/fixtures/upcoming:
 *   get:
 *     summary: Get upcoming fixtures
 *     tags: [Fixtures]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of upcoming fixtures
 */
router.get(
  '/upcoming',
  asyncHandler(fixtureController.getUpcoming.bind(fixtureController))
)

/**
 * @openapi
 * /api/fixtures/live:
 *   get:
 *     summary: Get live fixtures
 *     tags: [Fixtures]
 *     responses:
 *       200:
 *         description: List of currently live matches
 */
router.get(
  '/live',
  asyncHandler(fixtureController.getLive.bind(fixtureController))
)

/**
 * @openapi
 * /api/fixtures/finished:
 *   get:
 *     summary: Get finished fixtures
 *     tags: [Fixtures]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of finished fixtures
 */
router.get(
  '/finished',
  asyncHandler(fixtureController.getFinished.bind(fixtureController))
)

/**
 * @openapi
 * /api/fixtures/{id}:
 *   get:
 *     summary: Get fixture by ID
 *     tags: [Fixtures]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fixture details
 *       404:
 *         description: Fixture not found
 */
// IMPORTANT: register specific paths BEFORE the `/:id` catch-all,
// otherwise Express treats the literal string (e.g. "debug-api-status")
// as a path-param and the catch-all controller hijacks it.

// TEMP DEBUG — surfaces the API-Football /status response so we can verify
// account/subscription/quota state from outside Railway. Remove once the
// account is confirmed healthy.
router.get(
  '/debug-api-status',
  asyncHandler(async (_req, res) => {
    const { default: axios } = await import('axios')
    const useRapidApi = !!process.env.RAPIDAPI_KEY
    const url = useRapidApi
      ? 'https://api-football-v1.p.rapidapi.com/v3/status'
      : 'https://v3.football.api-sports.io/status'
    const headers = useRapidApi
      ? {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY!,
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        }
      : { 'x-apisports-key': process.env.API_FOOTBALL_KEY || '' }
    try {
      const resp = await axios.get(url, { headers, timeout: 10000 })
      res.json({
        route: useRapidApi ? 'rapidapi' : 'direct',
        keyPresent: useRapidApi
          ? !!process.env.RAPIDAPI_KEY
          : !!process.env.API_FOOTBALL_KEY,
        keyLast4: useRapidApi
          ? (process.env.RAPIDAPI_KEY || '').slice(-4)
          : (process.env.API_FOOTBALL_KEY || '').slice(-4),
        upstream: resp.data,
      })
    } catch (e: any) {
      res.json({
        route: useRapidApi ? 'rapidapi' : 'direct',
        keyPresent: useRapidApi
          ? !!process.env.RAPIDAPI_KEY
          : !!process.env.API_FOOTBALL_KEY,
        error: e?.message,
        upstreamError: e?.response?.data,
      })
    }
  })
)

// Sync fixtures from external APIs.
router.post(
  '/sync',
  asyncHandler(fixtureController.sync.bind(fixtureController))
)

// Catch-all: get single fixture by id. MUST stay last among GETs.
router.get(
  '/:id',
  asyncHandler(fixtureController.getById.bind(fixtureController))
)

export default router
