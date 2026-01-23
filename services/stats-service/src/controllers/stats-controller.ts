import { Request, Response } from 'express'
import { statsService } from '@/services/stats-service'

export class StatsController {
  // GET /api/stats/teams/:id
  async getTeamStats(req: Request, res: Response) {
    const teamId = parseInt(req.params.id)
    const season = req.query.season ? parseInt(req.query.season as string) : undefined

    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' })
    }

    const stats = await statsService.getTeamStats(teamId, season)
    res.json({ data: stats })
  }

  // GET /api/stats/teams/:id/form
  async getTeamForm(req: Request, res: Response) {
    const teamId = parseInt(req.params.id)
    const lastN = req.query.last ? parseInt(req.query.last as string) : 5

    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' })
    }

    const form = await statsService.getTeamForm(teamId, Math.min(lastN, 20))
    res.json({ data: form })
  }

  // GET /api/stats/compare
  async compareTeams(req: Request, res: Response) {
    const team1 = parseInt(req.query.team1 as string)
    const team2 = parseInt(req.query.team2 as string)

    if (isNaN(team1) || isNaN(team2)) {
      return res.status(400).json({ error: 'Invalid team IDs. Use ?team1=X&team2=Y' })
    }

    if (team1 === team2) {
      return res.status(400).json({ error: 'Cannot compare a team with itself' })
    }

    const comparison = await statsService.compareTeams(team1, team2)
    res.json({ data: comparison })
  }

  // GET /api/stats/h2h/:team1/:team2
  async getH2H(req: Request, res: Response) {
    const team1Id = parseInt(req.params.team1)
    const team2Id = parseInt(req.params.team2)

    if (isNaN(team1Id) || isNaN(team2Id)) {
      return res.status(400).json({ error: 'Invalid team IDs' })
    }

    const h2h = await statsService.getH2H(team1Id, team2Id)
    res.json({ data: h2h })
  }

  // GET /api/stats/leagues/:id/standings
  async getStandings(req: Request, res: Response) {
    const leagueId = parseInt(req.params.id)
    const season = req.query.season ? parseInt(req.query.season as string) : undefined

    if (isNaN(leagueId)) {
      return res.status(400).json({ error: 'Invalid league ID' })
    }

    const standings = await statsService.getLeagueStandings(leagueId, season)
    res.json({
      data: standings,
      count: standings.length,
    })
  }

  // POST /api/stats/recalculate
  async recalculate(req: Request, res: Response) {
    const season = req.body.season || new Date().getFullYear()

    const result = await statsService.recalculateAllStats(season)
    res.json({
      message: 'Stats recalculated successfully',
      ...result,
    })
  }
}

export const statsController = new StatsController()
