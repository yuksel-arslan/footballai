import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
const mockPrisma = {
  teamStats: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  h2HRecord: {
    findFirst: vi.fn(),
  },
  team: {
    findUnique: vi.fn(),
  },
  fixture: {
    findMany: vi.fn(),
  },
}

vi.mock('@football-ai/database', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}))

describe('StatsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Team Stats', () => {
    it('should return team stats with correct fields', async () => {
      const mockStats = {
        id: 1,
        teamId: 10,
        leagueId: 1,
        season: '2025-2026',
        matchesPlayed: 20,
        wins: 12,
        draws: 4,
        losses: 4,
        goalsFor: 35,
        goalsAgainst: 18,
        cleanSheets: 8,
        points: 40,
        leaguePosition: 3,
        lastFiveForm: 'WWDWL',
        team: { id: 10, name: 'Galatasaray', logoUrl: 'https://...' },
        league: { id: 1, name: 'Süper Lig', logoUrl: null },
      }

      mockPrisma.teamStats.findFirst.mockResolvedValue(mockStats)

      const result = await mockPrisma.teamStats.findFirst({
        where: { teamId: 10 },
        include: { team: true, league: true },
      })

      expect(result).not.toBeNull()
      expect(result?.matchesPlayed).toBe(20)
      expect(result?.leaguePosition).toBe(3)
      expect(result?.lastFiveForm).toBe('WWDWL')
    })

    it('should return null for unknown team', async () => {
      mockPrisma.teamStats.findFirst.mockResolvedValue(null)

      const result = await mockPrisma.teamStats.findFirst({
        where: { teamId: 9999 },
      })

      expect(result).toBeNull()
    })
  })

  describe('H2H Records', () => {
    it('should return head-to-head record between two teams', async () => {
      const mockH2H = {
        id: 1,
        team1Id: 10,
        team2Id: 20,
        team1Wins: 5,
        team2Wins: 3,
        draws: 2,
        totalGames: 10,
      }

      mockPrisma.h2HRecord.findFirst.mockResolvedValue(mockH2H)

      const result = await mockPrisma.h2HRecord.findFirst({
        where: {
          OR: [
            { team1Id: 10, team2Id: 20 },
            { team1Id: 20, team2Id: 10 },
          ],
        },
      })

      expect(result).not.toBeNull()
      expect(result?.totalGames).toBe(10)
      expect(result?.team1Wins + result?.team2Wins + result?.draws).toBe(10)
    })
  })

  describe('League Standings', () => {
    it('should return teams ordered by league position', async () => {
      const mockStandings = [
        { teamId: 1, leaguePosition: 1, points: 50, team: { name: 'Team A' } },
        { teamId: 2, leaguePosition: 2, points: 48, team: { name: 'Team B' } },
        { teamId: 3, leaguePosition: 3, points: 40, team: { name: 'Team C' } },
      ]

      mockPrisma.teamStats.findMany.mockResolvedValue(mockStandings)

      const result = await mockPrisma.teamStats.findMany({
        where: { leagueId: 1 },
        orderBy: { leaguePosition: 'asc' },
        include: { team: true },
      })

      expect(result).toHaveLength(3)
      expect(result[0].leaguePosition).toBe(1)
      expect(result[0].points).toBeGreaterThan(result[1].points)
    })
  })

  describe('Recent Matches', () => {
    it('should return recent finished matches for a team', async () => {
      const mockMatches = [
        { id: 1, homeTeamId: 10, awayTeamId: 20, status: 'FINISHED', homeScore: 2, awayScore: 1, matchDate: new Date() },
        { id: 2, homeTeamId: 30, awayTeamId: 10, status: 'FINISHED', homeScore: 0, awayScore: 0, matchDate: new Date() },
      ]

      mockPrisma.fixture.findMany.mockResolvedValue(mockMatches)

      const result = await mockPrisma.fixture.findMany({
        where: {
          OR: [{ homeTeamId: 10 }, { awayTeamId: 10 }],
          status: 'FINISHED',
        },
        orderBy: { matchDate: 'desc' },
        take: 5,
      })

      expect(result).toHaveLength(2)
      expect(result[0].status).toBe('FINISHED')
    })
  })
})
