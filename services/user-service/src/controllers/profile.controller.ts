import type { Request, Response, NextFunction } from 'express'
import { userService } from '../services/user.service'
import { updateProfileSchema } from '../types/auth.types'
import { z } from 'zod'

class ProfileController {
  /** GET /api/profile */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user
      res.json({ success: true, data: user })
    } catch (error) {
      next(error)
    }
  }

  /** PUT /api/profile */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id
      const input = updateProfileSchema.parse(req.body)
      const user = await userService.updateProfile(userId, input)

      res.json({ success: true, data: user })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors })
        return
      }
      next(error)
    }
  }

  /** GET /api/favorites/teams */
  async getFavoriteTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id
      const teams = await userService.getFavoriteTeams(userId)
      res.json({ success: true, data: teams })
    } catch (error) {
      next(error)
    }
  }

  /** POST /api/favorites/teams/:id */
  async addFavoriteTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id
      const teamId = parseInt(req.params.id as string)
      if (isNaN(teamId)) {
        res.status(400).json({ error: 'Invalid team ID' })
        return
      }

      const result = await userService.addFavoriteTeam(userId, teamId)
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  /** DELETE /api/favorites/teams/:id */
  async removeFavoriteTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id
      const teamId = parseInt(req.params.id as string)
      if (isNaN(teamId)) {
        res.status(400).json({ error: 'Invalid team ID' })
        return
      }

      await userService.removeFavoriteTeam(userId, teamId)
      res.json({ success: true })
    } catch (error) {
      next(error)
    }
  }

  /** GET /api/favorites/leagues */
  async getFavoriteLeagues(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id
      const leagues = await userService.getFavoriteLeagues(userId)
      res.json({ success: true, data: leagues })
    } catch (error) {
      next(error)
    }
  }

  /** POST /api/favorites/leagues/:id */
  async addFavoriteLeague(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id
      const leagueId = parseInt(req.params.id as string)
      if (isNaN(leagueId)) {
        res.status(400).json({ error: 'Invalid league ID' })
        return
      }

      const result = await userService.addFavoriteLeague(userId, leagueId)
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  /** DELETE /api/favorites/leagues/:id */
  async removeFavoriteLeague(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id
      const leagueId = parseInt(req.params.id as string)
      if (isNaN(leagueId)) {
        res.status(400).json({ error: 'Invalid league ID' })
        return
      }

      await userService.removeFavoriteLeague(userId, leagueId)
      res.json({ success: true })
    } catch (error) {
      next(error)
    }
  }
}

export const profileController = new ProfileController()
