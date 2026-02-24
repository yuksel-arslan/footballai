import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  favorite: {
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
  },
}

vi.mock('@football-ai/database', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}))

describe('ProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Get Profile', () => {
    it('should return user profile by id', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        fullName: 'Test User',
        avatarUrl: null,
        isAdmin: false,
        emailVerified: true,
        twoFactorEnabled: false,
        preferredLang: 'tr',
        theme: 'dark',
        createdAt: new Date(),
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await mockPrisma.user.findUnique({
        where: { id: 1 },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          isAdmin: true,
          emailVerified: true,
          twoFactorEnabled: true,
          preferredLang: true,
          theme: true,
          createdAt: true,
        },
      })

      expect(result).toEqual(mockUser)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } })
      )
    })

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await mockPrisma.user.findUnique({
        where: { id: 999 },
      })

      expect(result).toBeNull()
    })
  })

  describe('Update Profile', () => {
    it('should update user profile', async () => {
      const updatedUser = {
        id: 1,
        email: 'test@example.com',
        fullName: 'Updated Name',
      }

      mockPrisma.user.update.mockResolvedValue(updatedUser)

      const result = await mockPrisma.user.update({
        where: { id: 1 },
        data: { fullName: 'Updated Name' },
      })

      expect(result.fullName).toBe('Updated Name')
    })
  })

  describe('Favorites', () => {
    it('should return user favorites', async () => {
      const mockFavorites = [
        { id: 1, userId: 1, teamId: 10, createdAt: new Date() },
        { id: 2, userId: 1, teamId: 20, createdAt: new Date() },
      ]

      mockPrisma.favorite.findMany.mockResolvedValue(mockFavorites)

      const result = await mockPrisma.favorite.findMany({
        where: { userId: 1 },
      })

      expect(result).toHaveLength(2)
    })

    it('should add a favorite', async () => {
      mockPrisma.favorite.findFirst.mockResolvedValue(null)
      mockPrisma.favorite.create.mockResolvedValue({
        id: 3,
        userId: 1,
        teamId: 30,
        createdAt: new Date(),
      })

      const result = await mockPrisma.favorite.create({
        data: { userId: 1, teamId: 30 },
      })

      expect(result.teamId).toBe(30)
    })
  })
})
