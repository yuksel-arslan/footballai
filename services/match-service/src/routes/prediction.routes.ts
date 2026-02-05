import { Router } from 'express';
import { predictionController } from '../controllers/prediction.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/async-handler';

const router = Router();

/**
 * @route   GET /api/predictions/:fixtureId
 * @desc    Get AI prediction for a fixture
 * @access  Private (requires JWT token)
 */
router.get(
  '/:fixtureId',
  authMiddleware,
  asyncHandler(predictionController.getPrediction.bind(predictionController))
);

export default router;
