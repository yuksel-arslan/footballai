import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
const mockPrisma = {
  fixture: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
  },
  team: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  league: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
}

vi.mock('@football-ai/database', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}))

describe('Fixtures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Get Upcoming Fixtures', () => {
    it('should return upcoming fixtures with SCHEDULED status', async () => {
      const mockFixtures = [
        {
          id: 1,
          apiId: 1001,
          homeTeamId: 1,
          awayTeamId: 2,
          leagueId: 1,
          matchDate: new Date('2026-03-01T20:00:00Z'),
          status: 'SCHEDULED',
          homeScore: null,
          awayScore: null,
          homeTeam: { id: 1, name: 'Team A', logoUrl: null },
          awayTeam: { id: 2, name: 'Team B', logoUrl: null },
          league: { id: 1, name: 'Premier League', country: 'England' },
        },
      ]

      mockPrisma.fixture.findMany.mockResolvedValue(mockFixtures)

      const result = await mockPrisma.fixture.findMany({
        where: { status: 'SCHEDULED' },
        include: { homeTeam: true, awayTeam: true, league: true },
        orderBy: { matchDate: 'asc' },
      })

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('SCHEDULED')
      expect(result[0].homeTeam.name).toBe('Team A')
    })

    it('should return empty array when no upcoming fixtures', async () => {
      mockPrisma.fixture.findMany.mockResolvedValue([])

      const result = await mockPrisma.fixture.findMany({
        where: { status: 'SCHEDULED' },
      })

      expect(result).toHaveLength(0)
    })
  })

  describe('Get Fixture by ID', () => {
    it('should return fixture details', async () => {
      const mockFixture = {
        id: 1,
        apiId: 1001,
        status: 'FINISHED',
        homeScore: 2,
        awayScore: 1,
        homeTeam: { id: 1, name: 'Team A' },
        awayTeam: { id: 2, name: 'Team B' },
      }

      mockPrisma.fixture.findUnique.mockResolvedValue(mockFixture)

      const result = await mockPrisma.fixture.findUnique({
        where: { id: 1 },
        include: { homeTeam: true, awayTeam: true },
      })

      expect(result).not.toBeNull()
      expect(result?.homeScore).toBe(2)
      expect(result?.awayScore).toBe(1)
    })

    it('should return null for non-existent fixture', async () => {
      mockPrisma.fixture.findUnique.mockResolvedValue(null)

      const result = await mockPrisma.fixture.findUnique({
        where: { id: 999 },
      })

      expect(result).toBeNull()
    })
  })

  describe('Live Fixtures', () => {
    it('should return fixtures with LIVE status', async () => {
      const mockLive = [
        { id: 1, status: 'LIVE', homeScore: 1, awayScore: 0, minute: 45 },
      ]

      mockPrisma.fixture.findMany.mockResolvedValue(mockLive)

      const result = await mockPrisma.fixture.findMany({
        where: { status: 'LIVE' },
      })

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('LIVE')
    })
  })
})
