import { Router, Request, Response } from 'express'
import { PrismaClient } from '@football-ai/database'
import { asyncHandler } from '../middleware/async-handler'
import { z } from 'zod'

const prisma = new PrismaClient()
const router: import('express').Router = Router()

const createPredictionSchema = z.object({
  fixtureId: z.number().int().positive(),
  predictedResult: z.enum(['home', 'draw', 'away']),
})

// POST /api/profile/predictions — Create prediction
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId as string
    const body = createPredictionSchema.parse(req.body)

    // Find an AI prediction for this fixture to link to
    const prediction = await prisma.prediction.findFirst({
      where: { fixtureId: body.fixtureId },
      orderBy: { createdAt: 'desc' },
    })

    if (!prediction) {
      res.status(404).json({ success: false, error: 'No prediction found for this fixture' })
      return
    }

    // Check if user already predicted for this fixture
    const existing = await prisma.userPrediction.findFirst({
      where: {
        userId,
        prediction: { fixtureId: body.fixtureId },
      },
    })

    if (existing) {
      // Update existing prediction
      const updated = await prisma.userPrediction.update({
        where: { id: existing.id },
        data: { predictedResult: body.predictedResult },
        include: {
          prediction: {
            include: {
              fixture: {
                include: {
                  homeTeam: true,
                  awayTeam: true,
                  league: true,
                },
              },
            },
          },
        },
      })
      res.json({ success: true, data: updated })
      return
    }

    const userPrediction = await prisma.userPrediction.create({
      data: {
        userId,
        predictionId: prediction.id,
        predictedResult: body.predictedResult,
      },
      include: {
        prediction: {
          include: {
            fixture: {
              include: {
                homeTeam: true,
                awayTeam: true,
                league: true,
              },
            },
          },
        },
      },
    })

    res.status(201).json({ success: true, data: userPrediction })
  })
)// GET /api/profile/predictions — List user predictions (paginated)
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId as string
    const page = Math.max(1, parseInt(String(req.query.page || '1')))
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'))))
    const skip = (page - 1) * limit

    const [predictions, total] = await Promise.all([
      prisma.userPrediction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          prediction: {
            include: {
              fixture: {
                include: {
                  homeTeam: true,
                  awayTeam: true,
                  league: true,
                },
              },
            },
          },
        },
      }),
      prisma.userPrediction.count({ where: { userId } }),
    ])

    res.json({
      success: true,
      data: predictions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  })
)// GET /api/profile/predictions/stats — Accuracy statistics
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId as string

    const [total, correct] = await Promise.all([
      prisma.userPrediction.count({ where: { userId } }),
      prisma.userPrediction.count({ where: { userId, wasCorrect: true } }),
    ])

    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

    res.json({
      success: true,
      data: {
        total,
        correct,
        accuracy,
      },
    })
  })
)// DELETE /api/profile/predictions/:id — Delete prediction
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId as string
    const id = parseInt(String(req.params.id))

    const prediction = await prisma.userPrediction.findFirst({
      where: { id, userId },
    })

    if (!prediction) {
      res.status(404).json({ success: false, error: 'Prediction not found' })
      return
    }

    await prisma.userPrediction.delete({ where: { id } })
    res.json({ success: true })
  })
)

export default router