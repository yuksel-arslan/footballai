import { Router, type Router as RouterType } from 'express'
import { predictionController } from '../controllers/prediction.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { asyncHandler } from '../middleware/async-handler'

const router: RouterType = Router()

// GET /api/predictions/model/info - ML model bilgisi (public)
router.get(
  '/model/info',
  asyncHandler(predictionController.getModelInfo.bind(predictionController))
)

// POST /api/predictions/ml - ML tahmin (Poisson + XGBoost)
router.post(
  '/ml',
  asyncHandler(predictionController.getMLPrediction.bind(predictionController))
)

// GET /api/predictions/:fixtureId - AI tahmin (Gemini, auth required)
router.get(
  '/:fixtureId',
  authMiddleware,
  asyncHandler(predictionController.getPrediction.bind(predictionController))
)

export default router
