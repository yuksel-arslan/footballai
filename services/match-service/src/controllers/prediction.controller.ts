import type { Request, Response, NextFunction } from 'express';
import { aiPredictionService } from '../services/ai-prediction.service';

class PredictionController {
  /**
   * Get AI prediction for a fixture
   * GET /api/predictions/:fixtureId
   */
  async getPrediction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fixtureId = parseInt(req.params.fixtureId as string);

      if (isNaN(fixtureId)) {
        res.status(400).json({
          success: false,
          message: 'Geçersiz fixtureId parametresi',
        });
        return;
      }

      const prediction = await aiPredictionService.generatePrediction(fixtureId);

      res.status(200).json({
        success: true,
        data: prediction,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const predictionController = new PredictionController();
