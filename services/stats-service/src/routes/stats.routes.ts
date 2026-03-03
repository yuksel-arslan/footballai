import { Router, type Router as RouterType } from 'express'
import { statsController } from '../controllers/stats.controller'
import { asyncHandler } from '../middleware/async-handler'

const router: RouterType = Router()

/**
 * @openapi
 * /api/stats/teams/{id}:
 *   get:
 *     summary: Get team statistics
 *     tags: [Stats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Team statistics
 */
router.get(
  '/teams/:id',
  asyncHandler(statsController.getTeamStats.bind(statsController))
)

/**
 * @openapi
 * /api/stats/teams/{id}/form:
 *   get:
 *     summary: Get team recent form
 *     tags: [Stats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Team form (last 5 matches)
 */
router.get(
  '/teams/:id/form',
  asyncHandler(statsController.getTeamForm.bind(statsController))
)

/**
 * @openapi
 * /api/stats/compare:
 *   get:
 *     summary: Compare two teams
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: team1
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: team2
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Side-by-side team comparison
 */
router.get(
  '/compare',
  asyncHandler(statsController.compareTeams.bind(statsController))
)

/**
 * @openapi
 * /api/stats/leagues/{id}/standings:
 *   get:
 *     summary: Get league standings
 *     tags: [Stats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: League standings table
 */
router.get(
  '/leagues/:id/standings',
  asyncHandler(statsController.getStandings.bind(statsController))
)

/**
 * @openapi
 * /api/stats/h2h/{team1}/{team2}:
 *   get:
 *     summary: Get head-to-head record
 *     tags: [Stats]
 *     parameters:
 *       - in: path
 *         name: team1
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: team2
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: H2H record between two teams
 */
router.get(
  '/h2h/:team1/:team2',
  asyncHandler(statsController.getH2H.bind(statsController))
)

export default router
