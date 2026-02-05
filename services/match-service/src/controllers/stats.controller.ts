import type { Request, Response, NextFunction } from 'express';
import { statsService } from '../services/stats.service';
import { z } from 'zod';

class StatsController {
  /**
   * Get league standings
   * GET /api/stats/standings/:leagueId/:season
   */
  async getStandings(req: Request, res: Response, next: NextFunction) {
    try {
      const leagueId = parseInt(req.params.leagueId);
      const season = parseInt(req.params.season);

      if (isNaN(leagueId) || isNaN(season)) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz leagueId veya season parametresi',
        });
      }

      const standings = await statsService.getStandings(leagueId, season);

      res.status(200).json({
        success: true,
        data: standings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get team stats
   * GET /api/stats/team/:teamId/:leagueId/:season
   */
  async getTeamStats(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = parseInt(req.params.teamId);
      const leagueId = parseInt(req.params.leagueId);
      const season = parseInt(req.params.season);

      if (isNaN(teamId) || isNaN(leagueId) || isNaN(season)) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz parametreler',
        });
      }

      const result = await statsService.getTeamStats(teamId, leagueId, season);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Head-to-Head statistics
   * GET /api/stats/h2h?t1=:team1Id&t2=:team2Id
   */
  async getH2H(req: Request, res: Response, next: NextFunction) {
    try {
      const team1Id = parseInt(req.query.t1 as string);
      const team2Id = parseInt(req.query.t2 as string);

      if (isNaN(team1Id) || isNaN(team2Id)) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz team ID parametreleri',
        });
      }

      const result = await statsService.getH2H(team1Id, team2Id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const statsController = new StatsController();
