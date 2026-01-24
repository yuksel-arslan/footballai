import { Request, Response } from 'express'
import { fixtureService } from '@/services/fixture-service'
import { z } from 'zod'

// Validation schemas
const getFixturesSchema = z.object({
  date: z.string().optional(),
  league: z.string().transform(Number).optional(),
  team: z.string().transform(Number).optional(),
  status: z.enum(['SCHEDULED', 'LIVE', 'FINISHED']).optional(),
  limit: z.string().transform(Number).default('20'),
  offset: z.string().transform(Number).default('0'),
})

export class FixtureController {
  // GET /api/fixtures/upcoming
  async getUpcoming(req: Request, res: Response) {
    try {
      const params = getFixturesSchema.parse(req.query)

      const fixtures = await fixtureService.getUpcomingFixtures({
        date: params.date,
        league: params.league,
        team: params.team,
        limit: params.limit,
        offset: params.offset,
      })

      return res.json({
        data: fixtures,
        pagination: {
          limit: params.limit,
          offset: params.offset,
          total: fixtures.length,
        },
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors })
      }
      throw error
    }
  }

  // GET /api/fixtures/live
  async getLive(_req: Request, res: Response) {
    try {
      const fixtures = await fixtureService.getLiveFixtures()

      return res.json({
        data: fixtures,
        count: fixtures.length,
      })
    } catch (error) {
      throw error
    }
  }

  // GET /api/fixtures/:id
  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid fixture ID' })
      }

      const fixture = await fixtureService.getFixtureById(id)

      if (!fixture) {
        return res.status(404).json({ error: 'Fixture not found' })
      }

      return res.json({ data: fixture })
    } catch (error) {
      throw error
    }
  }

  // POST /api/fixtures/sync
  async sync(req: Request, res: Response) {
    try {
      const { date, league } = req.body

      const result = await fixtureService.syncFixtures({ date, league })

      return res.json({
        message: 'Fixtures synced successfully',
        synced: result.synced,
        updated: result.updated,
      })
    } catch (error) {
      throw error
    }
  }
}

export const fixtureController = new FixtureController()
