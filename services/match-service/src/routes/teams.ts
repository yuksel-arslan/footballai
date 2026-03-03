import { Router, type Router as RouterType } from 'express'
import { prisma } from '@football-ai/database'
import { asyncHandler } from '../middleware/async-handler'

const router: RouterType = Router()

// GET /api/teams/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)
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
}))

// GET /api/teams/:id/fixtures
router.get('/:id/fixtures', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)
  const limit = parseInt(req.query.limit as string) || 10
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
}))

// GET /api/teams/search?q=arsenal
router.get('/', asyncHandler(async (req, res) => {
  const q = req.query.q as string
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
}))

export default router
