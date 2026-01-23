import { Router } from 'express'
import { statsController } from '@/controllers/stats-controller'
import { asyncHandler } from '@/middleware/async-handler'

const router = Router()

// Team stats endpoints
router.get('/teams/:id', asyncHandler(statsController.getTeamStats.bind(statsController)))
router.get('/teams/:id/form', asyncHandler(statsController.getTeamForm.bind(statsController)))

// Compare teams
router.get('/compare', asyncHandler(statsController.compareTeams.bind(statsController)))

// Head-to-head
router.get('/h2h/:team1/:team2', asyncHandler(statsController.getH2H.bind(statsController)))

// League standings
router.get(
  '/leagues/:id/standings',
  asyncHandler(statsController.getStandings.bind(statsController))
)

// Recalculate stats (admin endpoint)
router.post('/recalculate', asyncHandler(statsController.recalculate.bind(statsController)))

export default router
