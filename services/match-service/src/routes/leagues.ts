import { Router, type Router as RouterType } from 'express'
import { prisma } from '@football-ai/database'
import { asyncHandler } from '../middleware/async-handler'
import { adminMiddleware } from '../middleware/auth.middleware'
import { CURATED_LEAGUE_IDS } from '../services/fixture-service'

const router: RouterType = Router()

// ── Admin activity control (lists curated competitions incl. passive) ──
// Registered before the `/:code/...` routes. Admin-gated.
// Scoped to CURATED_LEAGUE_IDS so junk leagues that accumulate in the DB during
// fixture sync (created passive) never clutter the activity panel — operators
// only ever toggle the competitions we actually run.
router.get(
  '/admin/all',
  adminMiddleware,
  asyncHandler(async (_req, res) => {
    const leagues = await prisma.league.findMany({
      where: { apiId: { in: Array.from(CURATED_LEAGUE_IDS) } },
      orderBy: [{ active: 'desc' }, { country: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        apiId: true,
        name: true,
        country: true,
        logoUrl: true,
        season: true,
        active: true,
      },
    })
    res.json({ success: true, data: leagues })
  })
)

router.patch(
  '/admin/:id',
  adminMiddleware,
  asyncHandler(async (req, res) => {
    const id = parseInt(String(req.params.id))
    const active = (req.body ?? {}).active
    if (Number.isNaN(id) || typeof active !== 'boolean') {
      res
        .status(400)
        .json({ success: false, error: 'id and active(boolean) required' })
      return
    }
    try {
      const updated = await prisma.league.update({
        where: { id },
        data: { active },
        select: { id: true, name: true, active: true },
      })
      res.json({ success: true, data: updated })
    } catch {
      res.status(404).json({ success: false, error: 'league_not_found' })
    }
  })
)

/**
 * @openapi
 * /api/leagues:
 *   get:
 *     summary: Get all leagues
 *     tags: [Leagues]
 *     responses:
 *       200:
 *         description: List of leagues
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const leagues = await prisma.league.findMany({
      where: { active: true }, // passive competitions are hidden from public lists
      distinct: ['name'],
      orderBy: { name: 'asc' },
      select: {
        id: true,
        apiId: true,
        name: true,
        country: true,
        logoUrl: true,
        season: true,
      },
    })
    res.json({ success: true, data: leagues })
  })
)

/**
 * @openapi
 * /api/leagues/{code}/fixtures:
 *   get:
 *     summary: Get fixtures for a league
 *     tags: [Leagues]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: League fixtures
 *       404:
 *         description: League not found
 */
router.get(
  '/:code/fixtures',
  asyncHandler(async (req, res) => {
    const code = String(req.params.code)
    const limit = parseInt(String(req.query.limit || '20'))
    const league = await prisma.league.findFirst({
      where: {
        OR: [
          { name: { contains: code, mode: 'insensitive' } },
          { apiId: parseInt(code) || -1 },
        ],
      },
    })
    if (!league) {
      res.status(404).json({ error: 'League not found' })
      return
    }
    const fixtures = await prisma.fixture.findMany({
      where: { leagueId: league.id },
      include: { homeTeam: true, awayTeam: true, league: true },
      orderBy: { matchDate: 'desc' },
      take: limit,
    })
    res.json({ success: true, data: fixtures })
  })
)

/**
 * @openapi
 * /api/leagues/{code}/standings:
 *   get:
 *     summary: Get league standings
 *     tags: [Leagues]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: season
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: League standings table
 *       404:
 *         description: League not found
 */
router.get(
  '/:code/standings',
  asyncHandler(async (req, res) => {
    const code = String(req.params.code)
    const season = req.query.season
      ? parseInt(String(req.query.season))
      : new Date().getFullYear()
    const league = await prisma.league.findFirst({
      where: {
        OR: [
          { name: { contains: code, mode: 'insensitive' } },
          { apiId: parseInt(code) || -1 },
        ],
        season,
      },
    })
    if (!league) {
      res.status(404).json({ error: 'League not found' })
      return
    }
    // standings query will work once Prisma schema has Standing model
    res.json({ success: true, data: [], leagueId: league.id })
  })
)

export default router
