import { Router, type Router as RouterType } from 'express'
import { fixtureController } from '../controllers/fixture-controller'
import { asyncHandler } from '../middleware/async-handler'

const router: RouterType = Router()

// GET /api/fixtures/upcoming
router.get('/upcoming', asyncHandler(fixtureController.getUpcoming.bind(fixtureController)))

// GET /api/fixtures/live
router.get('/live', asyncHandler(fixtureController.getLive.bind(fixtureController)))

// GET /api/fixtures/:id
router.get('/:id', asyncHandler(fixtureController.getById.bind(fixtureController)))

// POST /api/fixtures/sync (admin only in production)
router.post('/sync', asyncHandler(fixtureController.sync.bind(fixtureController)))

export default router
