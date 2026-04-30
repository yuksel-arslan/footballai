import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@football-ai/database'
import { aiPredictionService } from '../services/ai-prediction.service'
import { config } from '../config'

// Map fixture's home/away score into the same string vocabulary the user
// recorded their prediction with (predictedResult column: 'home' | 'draw' | 'away').
const deriveActualResult = (
  homeScore: number | null,
  awayScore: number | null
): string | null => {
  if (homeScore == null || awayScore == null) return null
  if (homeScore > awayScore) return 'home'
  if (homeScore < awayScore) return 'away'
  return 'draw'
}

class PredictionController {
  /**
   * Get AI prediction for a fixture (Gemini-based)
   * GET /api/predictions/:fixtureId
   */
  async getPrediction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const fixtureId = parseInt(req.params.fixtureId as string)
      if (isNaN(fixtureId)) {
        res.status(400).json({ success: false, error: 'Invalid fixtureId' })
        return
      }

      const prediction = await aiPredictionService.generatePrediction(fixtureId)
      res.json({ success: true, data: prediction })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get ML model prediction (Poisson + XGBoost via ml-service)
   * POST /api/predictions/ml
   */
  async getMLPrediction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const mlUrl = config.mlServiceUrl || 'http://localhost:8000'
      const response = await fetch(mlUrl + '/api/predictions/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as Record<
          string,
          string
        >
        res.status(response.status).json({
          success: false,
          error: err.detail || 'ML prediction failed',
        })
        return
      }

      const data = await response.json()
      res.json({ success: true, data, source: 'ml-service' })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Compare a user's prediction for a fixture against the actual result.
   * GET /api/predictions/compare?fixtureId=N
   * Auth required — uses req.user.id.
   */
  async getComparison(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user?.id as string | undefined
      if (!userId) {
        res
          .status(401)
          .json({ success: false, error: 'Authentication required' })
        return
      }
      const fixtureIdRaw = req.query.fixtureId
      const fixtureId =
        typeof fixtureIdRaw === 'string' ? parseInt(fixtureIdRaw, 10) : NaN
      if (!Number.isFinite(fixtureId)) {
        res
          .status(400)
          .json({ success: false, error: 'fixtureId query param required' })
        return
      }

      const fixture = await prisma.fixture.findUnique({
        where: { id: fixtureId },
        include: {
          homeTeam: true,
          awayTeam: true,
          league: { select: { id: true, name: true, logo: true } },
        },
      })
      if (!fixture) {
        res.status(404).json({ success: false, error: 'Fixture not found' })
        return
      }

      const actualResult = deriveActualResult(
        fixture.homeScore,
        fixture.awayScore
      )

      const userPredictionRow = await prisma.userPrediction.findUnique({
        where: { userId_fixtureId: { userId, fixtureId } },
      })

      const userPrediction = userPredictionRow
        ? {
            predictedResult: userPredictionRow.predictedResult,
            predictedHomeScore: userPredictionRow.predictedHomeScore,
            predictedAwayScore: userPredictionRow.predictedAwayScore,
            // Recompute correctness on the fly so a stale stored value can't
            // diverge from the live fixture's outcome.
            wasCorrect:
              actualResult == null
                ? null
                : userPredictionRow.predictedResult === actualResult,
            scoreCorrect:
              fixture.homeScore == null || fixture.awayScore == null
                ? null
                : userPredictionRow.predictedHomeScore === fixture.homeScore &&
                  userPredictionRow.predictedAwayScore === fixture.awayScore,
          }
        : null

      res.json({
        success: true,
        data: {
          fixture: {
            id: fixture.id,
            matchDate: fixture.matchDate,
            status: fixture.status,
            homeScore: fixture.homeScore,
            awayScore: fixture.awayScore,
            homeTeam: { id: fixture.homeTeam.id, name: fixture.homeTeam.name },
            awayTeam: { id: fixture.awayTeam.id, name: fixture.awayTeam.name },
            league: fixture.league,
          },
          userPrediction,
          actualResult,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get ML model info
   * GET /api/predictions/model/info
   */
  async getModelInfo(
    _req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      const mlUrl = config.mlServiceUrl || 'http://localhost:8000'
      const response = await fetch(mlUrl + '/api/predictions/model/info', {
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) {
        res
          .status(502)
          .json({ success: false, error: 'ML service unavailable' })
        return
      }

      const data = await response.json()
      res.json({ success: true, data })
    } catch {
      res.status(502).json({ success: false, error: 'ML service unavailable' })
    }
  }
}

export const predictionController = new PredictionController()
