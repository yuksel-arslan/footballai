import { Router, type Router as RouterType } from 'express'
import { predictionController } from '../controllers/prediction.controller'
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware'
import { asyncHandler } from '../middleware/async-handler'

const router: RouterType = Router()

/**
 * @openapi
 * /api/predictions/model/info:
 *   get:
 *     summary: Get ML model information
 *     tags: [Predictions]
 *     responses:
 *       200:
 *         description: Model version and status
 */
router.get(
  '/model/info',
  asyncHandler(predictionController.getModelInfo.bind(predictionController))
)

/**
 * @openapi
 * /api/predictions/ml:
 *   post:
 *     summary: Get ML prediction (Poisson + XGBoost)
 *     tags: [Predictions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: ML prediction result
 */
router.post(
  '/ml',
  authMiddleware,
  asyncHandler(predictionController.getMLPrediction.bind(predictionController))
)

/**
 * @openapi
 * /api/predictions/compare:
 *   get:
 *     summary: Compare current user's prediction for a fixture against the actual result
 *     tags: [Predictions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fixtureId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fixture + user's prediction (or null) + actual result + correctness flags
 */
// IMPORTANT: must be registered BEFORE the `/:fixtureId` catch-all, otherwise
// Express interprets "compare" as a fixtureId path param.
router.get(
  '/compare',
  authMiddleware,
  asyncHandler(predictionController.getComparison.bind(predictionController))
)

/**
 * @openapi
 * /api/predictions/dixon-coles:
 *   post:
 *     summary: Dixon-Coles prediction + value-bet analysis (proxied to ml-service)
 *     tags: [Predictions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Calibrated probabilities + value bets
 */
// Registered BEFORE `/:fixtureId` so Express doesn't treat it as a fixtureId.
router.post(
  '/dixon-coles',
  authMiddleware,
  asyncHandler(predictionController.getDixonColes.bind(predictionController))
)

/**
 * @openapi
 * /api/predictions/value-bets:
 *   get:
 *     summary: Pre-computed value-bet list (cached, public)
 *     tags: [Predictions]
 *     responses:
 *       200:
 *         description: Ranked value bets across upcoming curated fixtures
 */
// Public + cheap (reads cache). BEFORE `/:fixtureId`.
router.get(
  '/value-bets',
  asyncHandler(predictionController.getValueBets.bind(predictionController))
)

/**
 * @openapi
 * /api/predictions/value-bets/refresh:
 *   post:
 *     summary: Recompute the value-bet cache (admin only, cost-guarded)
 *     tags: [Predictions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Refresh summary
 *       429:
 *         description: Cooldown active
 */
router.post(
  '/value-bets/refresh',
  adminMiddleware,
  asyncHandler(predictionController.refreshValueBets.bind(predictionController))
)

// Public diagnostic: API key presence + international history pool + a live
// API-Football probe. No secrets returned. BEFORE `/:fixtureId`.
router.get(
  '/diag',
  asyncHandler(predictionController.getDiag.bind(predictionController))
)

/**
 * @openapi
 * /api/predictions/{fixtureId}:
 *   get:
 *     summary: Get AI prediction for a fixture
 *     tags: [Predictions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fixtureId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: AI prediction with explanation
 *       401:
 *         description: Authentication required
 */
router.get(
  '/:fixtureId',
  authMiddleware,
  asyncHandler(predictionController.getPrediction.bind(predictionController))
)

export default router
