import { Router, type Router as RouterType } from 'express'
import { predictionController } from '../controllers/prediction.controller'
import { authMiddleware } from '../middleware/auth.middleware'
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
