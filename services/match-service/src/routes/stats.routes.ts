import { Router } from 'express';
import { statsController } from '../controllers/stats.controller';
import { asyncHandler } from '../middleware/async-handler';

const router = Router();

/**
 * @route   GET /api/stats/standings/:leagueId/:season
 * @desc    Get league standings
 * @access  Public
 */
router.get(
  '/standings/:leagueId/:season',
  asyncHandler(statsController.getStandings.bind(statsController))
);

/**
 * @route   GET /api/stats/team/:teamId/:leagueId/:season
 * @desc    Get team statistics and form
 * @access  Public
 */
router.get(
  '/team/:teamId/:leagueId/:season',
  asyncHandler(statsController.getTeamStats.bind(statsController))
);

/**
 * @route   GET /api/stats/h2h?t1=:team1Id&t2=:team2Id
 * @desc    Get head-to-head statistics
 * @access  Public
 */
router.get('/h2h', asyncHandler(statsController.getH2H.bind(statsController)));

export default router;
