import { Router, type Router as RouterType } from 'express'
import { prisma } from '@football-ai/database'
import { asyncHandler } from '../middleware/async-handler'

const router: RouterType = Router()

// GET /api/leagues
router.get('/', asyncHandler(async (_req, res) => {
  const leagues = await prisma.league.findMany({
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
}))

// GET /api/leagues/:code/fixtures
router.get('/:code/fixtures', asyncHandler(async (req, res) => {
  const { code } = req.params
  const limit = parseInt(req.query.limit as string) || 20
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
}))

// GET /api/leagues/:code/standings
router.get('/:code/standings', asyncHandler(async (req, res) => {
  const { code } = req.params
  const season = req.query.season ? parseInt(req.query.season as string) : new Date().getFullYear()
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
}))

export default router
