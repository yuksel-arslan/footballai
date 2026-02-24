import { PrismaClient } from '@football-ai/database'
import type { UpdateProfileInput } from '../types/auth.types'

const prisma = new PrismaClient()

class UserService {
  /** Update user profile */
  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name && { fullName: input.name }),
        ...(input.email && { email: input.email }),
      },
      select: { id: true, email: true, fullName: true, createdAt: true },
    })
    return user
  }

  /** Get user's favorite teams */
  async getFavoriteTeams(userId: string) {
    return prisma.favoriteTeam.findMany({
      where: { userId },
      include: { team: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  /** Add favorite team */
  async addFavoriteTeam(userId: string, teamId: number) {
    const existing = await prisma.favoriteTeam.findFirst({
      where: { userId, teamId },
    })
    if (existing) {
      throw new Error('Team already in favorites')
    }

    return prisma.favoriteTeam.create({
      data: { userId, teamId },
      include: { team: true },
    })
  }

  /** Remove favorite team */
  async removeFavoriteTeam(userId: string, teamId: number) {
    const favorite = await prisma.favoriteTeam.findFirst({
      where: { userId, teamId },
    })
    if (!favorite) {
      throw new Error('Favorite not found')
    }

    await prisma.favoriteTeam.delete({ where: { id: favorite.id } })
    return { success: true }
  }

  /** Get user's favorite leagues */
  async getFavoriteLeagues(userId: string) {
    return prisma.favoriteLeague.findMany({
      where: { userId },
      include: { league: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  /** Add favorite league */
  async addFavoriteLeague(userId: string, leagueId: number) {
    const existing = await prisma.favoriteLeague.findFirst({
      where: { userId, leagueId },
    })
    if (existing) {
      throw new Error('League already in favorites')
    }

    return prisma.favoriteLeague.create({
      data: { userId, leagueId },
      include: { league: true },
    })
  }

  /** Remove favorite league */
  async removeFavoriteLeague(userId: string, leagueId: number) {
    const favorite = await prisma.favoriteLeague.findFirst({
      where: { userId, leagueId },
    })
    if (!favorite) {
      throw new Error('Favorite not found')
    }

    await prisma.favoriteLeague.delete({ where: { id: favorite.id } })
    return { success: true }
  }
}

export const userService = new UserService()
