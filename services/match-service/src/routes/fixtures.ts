import { Router, type Router as RouterType } from 'express'
import { prisma } from '@football-ai/database'
import { fixtureController } from '../controllers/fixture-controller'
import { asyncHandler } from '../middleware/async-handler'

const router: RouterType = Router()

// GET /api/fixtures/training-data — ML training data export
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

// GET /api/fixtures/upcoming
router.get(
  '/upcoming',
  asyncHandler(fixtureController.getUpcoming.bind(fixtureController))
)

// GET /api/fixtures/live
router.get(
  '/live',
  asyncHandler(fixtureController.getLive.bind(fixtureController))
)

// GET /api/fixtures/finished
router.get(
  '/finished',
  asyncHandler(fixtureController.getFinished.bind(fixtureController))
)

// GET /api/fixtures/:id
router.get(
  '/:id',
  asyncHandler(fixtureController.getById.bind(fixtureController))
)

// POST /api/fixtures/sync (admin only in production)
router.post(
  '/sync',
  asyncHandler(fixtureController.sync.bind(fixtureController))
)

export default router
