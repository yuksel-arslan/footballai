import type { Request, Response, NextFunction } from 'express'
import { statsService } from '../services/stats.service'

class StatsController {
  /** GET /api/stats/teams/:id */
  async getTeamStats(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = parseInt(req.params.id)
      if (isNaN(teamId)) {
        return res.status(400).json({ error: 'Invalid team ID' })
      }

      const stats = await statsService.getTeamStats(teamId)
      res.json({ success: true, data: stats })
    } catch (error) {
      next(error)
    }
  }

  /** GET /api/stats/teams/:id/form */
  async getTeamForm(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = parseInt(req.params.id)
      if (isNaN(teamId)) {
        return res.status(400).json({ error: 'Invalid team ID' })
      }

      const form = await statsService.getTeamForm(teamId)
      res.json({ success: true, data: form })
    } catch (error) {
      next(error)
    }
  }

  /** GET /api/stats/compare?team1=:id&team2=:id */
  async compareTeams(req: Request, res: Response, next: NextFunction) {
    try {
      const team1 = parseInt(req.query.team1 as string)
      const team2 = parseInt(req.query.team2 as string)

      if (isNaN(team1) || isNaN(team2)) {
        return res.status(400).json({ error: 'Invalid team IDs' })
      }

      const comparison = await statsService.compareTeams(team1, team2)
      res.json({ success: true, data: comparison })
    } catch (error) {
      next(error)
    }
  }

  /** GET /api/stats/leagues/:id/standings */
  async getStandings(req: Request, res: Response, next: NextFunction) {
    try {
      const leagueId = parseInt(req.params.id)
      const season = req.query.season ? parseInt(req.query.season as string) : undefined

      if (isNaN(leagueId)) {
        return res.status(400).json({ error: 'Invalid league ID' })
      }

      const standings = await statsService.getStandings(leagueId, season)
      res.json({ success: true, data: standings })
    } catch (error) {
      next(error)
    }
  }

  /** GET /api/stats/h2h/:team1/:team2 */
  async getH2H(req: Request, res: Response, next: NextFunction) {
    try {
      const team1 = parseInt(req.params.team1)
      const team2 = parseInt(req.params.team2)

      if (isNaN(team1) || isNaN(team2)) {
        return res.status(400).json({ error: 'Invalid team IDs' })
      }

      const h2h = await statsService.getH2H(team1, team2)
      res.json({ success: true, data: h2h })
    } catch (error) {
      next(error)
    }
  }
}

export const statsController = new StatsController()
