import { Router, type Router as RouterType } from 'express'
import { statsController } from '../controllers/stats.controller'
import { asyncHandler } from '../middleware/async-handler'

const router: RouterType = Router()

router.get('/teams/:id', asyncHandler(statsController.getTeamStats.bind(statsController)))
router.get('/teams/:id/form', asyncHandler(statsController.getTeamForm.bind(statsController)))
router.get('/compare', asyncHandler(statsController.compareTeams.bind(statsController)))
router.get('/leagues/:id/standings', asyncHandler(statsController.getStandings.bind(statsController)))
router.get('/h2h/:team1/:team2', asyncHandler(statsController.getH2H.bind(statsController)))

export default router
