import { PrismaClient } from '@football-ai/database'

const prisma = new PrismaClient()

export interface UpdateProfileInput {
  fullName?: string
  avatarUrl?: string
  country?: string
  preferredLang?: string
  theme?: string
}

class UserService {
  // Get user profile
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        country: true,
        preferredLang: true,
        theme: true,
        emailVerified: true,
        createdAt: true,
        lastLogin: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    return user
  }

  // Update user profile
  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        country: true,
        preferredLang: true,
        theme: true,
      },
    })

    return user
  }

  // Get favorite teams
  async getFavoriteTeams(userId: string) {
    const favorites = await prisma.favoriteTeam.findMany({
      where: { userId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            country: true,
            league: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return favorites.map((f) => ({
      ...f.team,
      addedAt: f.createdAt,
    }))
  }

  // Add favorite team
  async addFavoriteTeam(userId: string, teamId: number) {
    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    })

    if (!team) {
      throw new Error('Team not found')
    }

    // Check if already favorited
    const existing = await prisma.favoriteTeam.findUnique({
      where: {
        userId_teamId: { userId, teamId },
      },
    })

    if (existing) {
      throw new Error('Team already in favorites')
    }

    await prisma.favoriteTeam.create({
      data: { userId, teamId },
    })

    return { message: 'Team added to favorites', teamId }
  }

  // Remove favorite team
  async removeFavoriteTeam(userId: string, teamId: number) {
    const result = await prisma.favoriteTeam.deleteMany({
      where: { userId, teamId },
    })

    if (result.count === 0) {
      throw new Error('Team not in favorites')
    }

    return { message: 'Team removed from favorites', teamId }
  }

  // Get favorite leagues
  async getFavoriteLeagues(userId: string) {
    const favorites = await prisma.favoriteLeague.findMany({
      where: { userId },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            country: true,
            logoUrl: true,
            season: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return favorites.map((f) => ({
      ...f.league,
      addedAt: f.createdAt,
    }))
  }

  // Add favorite league
  async addFavoriteLeague(userId: string, leagueId: number) {
    // Check if league exists
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    })

    if (!league) {
      throw new Error('League not found')
    }

    // Check if already favorited
    const existing = await prisma.favoriteLeague.findUnique({
      where: {
        userId_leagueId: { userId, leagueId },
      },
    })

    if (existing) {
      throw new Error('League already in favorites')
    }

    await prisma.favoriteLeague.create({
      data: { userId, leagueId },
    })

    return { message: 'League added to favorites', leagueId }
  }

  // Remove favorite league
  async removeFavoriteLeague(userId: string, leagueId: number) {
    const result = await prisma.favoriteLeague.deleteMany({
      where: { userId, leagueId },
    })

    if (result.count === 0) {
      throw new Error('League not in favorites')
    }

    return { message: 'League removed from favorites', leagueId }
  }

  // Get user notifications
  async getNotifications(userId: string, limit: number = 20, unreadOnly: boolean = false) {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    })

    return {
      notifications,
      unreadCount,
    }
  }

  // Mark notification as read
  async markNotificationRead(userId: string, notificationId: number) {
    const notification = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    })

    if (notification.count === 0) {
      throw new Error('Notification not found')
    }

    return { message: 'Notification marked as read' }
  }

  // Mark all notifications as read
  async markAllNotificationsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })

    return { message: 'All notifications marked as read', count: result.count }
  }

  // Delete user account
  async deleteAccount(userId: string) {
    // This will cascade delete all related data
    await prisma.user.delete({
      where: { id: userId },
    })

    return { message: 'Account deleted successfully' }
  }
}

export const userService = new UserService()
