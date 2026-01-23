import { Request, Response } from 'express'
import { z } from 'zod'
import { userService } from '@/services/user-service'

// Validation schemas
const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional(),
  country: z.string().length(2).optional(),
  preferredLang: z.string().max(5).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
})

export class UserController {
  // GET /api/profile
  async getProfile(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const profile = await userService.getProfile(req.user.userId)
    res.json({ data: profile })
  }

  // PUT /api/profile
  async updateProfile(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const validation = updateProfileSchema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      })
    }

    const profile = await userService.updateProfile(req.user.userId, validation.data)
    res.json({ data: profile })
  }

  // GET /api/favorites/teams
  async getFavoriteTeams(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const teams = await userService.getFavoriteTeams(req.user.userId)
    res.json({ data: teams, count: teams.length })
  }

  // POST /api/favorites/teams/:id
  async addFavoriteTeam(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const teamId = parseInt(req.params.id)
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' })
    }

    const result = await userService.addFavoriteTeam(req.user.userId, teamId)
    res.status(201).json(result)
  }

  // DELETE /api/favorites/teams/:id
  async removeFavoriteTeam(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const teamId = parseInt(req.params.id)
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' })
    }

    const result = await userService.removeFavoriteTeam(req.user.userId, teamId)
    res.json(result)
  }

  // GET /api/favorites/leagues
  async getFavoriteLeagues(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const leagues = await userService.getFavoriteLeagues(req.user.userId)
    res.json({ data: leagues, count: leagues.length })
  }

  // POST /api/favorites/leagues/:id
  async addFavoriteLeague(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const leagueId = parseInt(req.params.id)
    if (isNaN(leagueId)) {
      return res.status(400).json({ error: 'Invalid league ID' })
    }

    const result = await userService.addFavoriteLeague(req.user.userId, leagueId)
    res.status(201).json(result)
  }

  // DELETE /api/favorites/leagues/:id
  async removeFavoriteLeague(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const leagueId = parseInt(req.params.id)
    if (isNaN(leagueId)) {
      return res.status(400).json({ error: 'Invalid league ID' })
    }

    const result = await userService.removeFavoriteLeague(req.user.userId, leagueId)
    res.json(result)
  }

  // GET /api/notifications
  async getNotifications(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const limit = parseInt(req.query.limit as string) || 20
    const unreadOnly = req.query.unread === 'true'

    const result = await userService.getNotifications(req.user.userId, limit, unreadOnly)
    res.json({ data: result })
  }

  // POST /api/notifications/:id/read
  async markNotificationRead(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const notificationId = parseInt(req.params.id)
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' })
    }

    const result = await userService.markNotificationRead(req.user.userId, notificationId)
    res.json(result)
  }

  // POST /api/notifications/read-all
  async markAllNotificationsRead(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await userService.markAllNotificationsRead(req.user.userId)
    res.json(result)
  }

  // DELETE /api/profile (delete account)
  async deleteAccount(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await userService.deleteAccount(req.user.userId)
    res.json(result)
  }
}

export const userController = new UserController()
