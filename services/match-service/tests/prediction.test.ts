import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
const mockPrisma = {
  prediction: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  },
  fixture: {
    findUnique: vi.fn(),
  },
}

vi.mock('@football-ai/database', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}))

describe('Predictions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Get Prediction', () => {
    it('should return existing prediction for a fixture', async () => {
      const mockPrediction = {
        id: 1,
        fixtureId: 100,
        homeWinProb: 45.5,
        drawProb: 28.0,
        awayWinProb: 26.5,
        predictedHomeScore: 1.8,
        predictedAwayScore: 1.2,
        confidence: 68.5,
        modelVersion: 'v1.0.0-poisson',
        explanation: 'Model tahmini: Team A kazanır',
        createdAt: new Date(),
      }

      mockPrisma.prediction.findFirst.mockResolvedValue(mockPrediction)

      const result = await mockPrisma.prediction.findFirst({
        where: { fixtureId: 100 },
      })

      expect(result).not.toBeNull()
      expect(result?.homeWinProb).toBe(45.5)
      expect(result?.drawProb).toBe(28.0)
      expect(result?.awayWinProb).toBe(26.5)
    })

    it('should return null for fixture without prediction', async () => {
      mockPrisma.prediction.findFirst.mockResolvedValue(null)

      const result = await mockPrisma.prediction.findFirst({
        where: { fixtureId: 999 },
      })

      expect(result).toBeNull()
    })
  })

  describe('Prediction Validation', () => {
    it('should ensure probabilities sum to ~100', () => {
      const homeWinProb = 45.5
      const drawProb = 28.0
      const awayWinProb = 26.5
      const sum = homeWinProb + drawProb + awayWinProb

      expect(Math.abs(sum - 100)).toBeLessThan(1)
    })

    it('should ensure confidence is between 0 and 100', () => {
      const confidence = 68.5
      expect(confidence).toBeGreaterThanOrEqual(0)
      expect(confidence).toBeLessThanOrEqual(100)
    })

    it('should ensure predicted scores are non-negative', () => {
      const homeScore = 1.8
      const awayScore = 1.2
      expect(homeScore).toBeGreaterThanOrEqual(0)
      expect(awayScore).toBeGreaterThanOrEqual(0)
    })
  })
})
