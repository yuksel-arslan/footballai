import { Router, type Router as RouterType } from 'express'
import { prisma } from '@football-ai/database'
import { asyncHandler } from '../middleware/async-handler'

const router: RouterType = Router()

/**
 * @openapi
 * /api/teams:
 *   get:
 *     summary: Search teams by name
 *     tags: [Teams]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *     responses:
 *       200:
 *         description: Matching teams
 *       400:
 *         description: Query too short
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '')
    if (!q || q.length < 2) {
      res.status(400).json({ error: 'Query must be at least 2 characters' })
      return
    }
    const teams = await prisma.team.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      take: 20,
      orderBy: { name: 'asc' },
    })
    res.json({ success: true, data: teams })
  })
)

/**
 * @openapi
 * /api/teams/{id}:
 *   get:
 *     summary: Get team by ID
 *     tags: [Teams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Team details
 *       404:
 *         description: Team not found
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(String(req.params.id))
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid team ID' })
      return
    }
    const team = await prisma.team.findUnique({
      where: { id },
    })
    if (!team) {
      res.status(404).json({ error: 'Team not found' })
      return
    }
    res.json({ success: true, data: team })
  })
)

/**
 * @openapi
 * /api/teams/{id}/fixtures:
 *   get:
 *     summary: Get fixtures for a team
 *     tags: [Teams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Team fixtures
 */
router.get(
  '/:id/fixtures',
  asyncHandler(async (req, res) => {
    const id = parseInt(String(req.params.id))
    const limit = parseInt(String(req.query.limit || '10'))
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid team ID' })
      return
    }
    const fixtures = await prisma.fixture.findMany({
      where: {
        OR: [{ homeTeamId: id }, { awayTeamId: id }],
      },
      include: { homeTeam: true, awayTeam: true, league: true },
      orderBy: { matchDate: 'desc' },
      take: limit,
    })
    res.json({ success: true, data: fixtures })
  })
)

export default router
