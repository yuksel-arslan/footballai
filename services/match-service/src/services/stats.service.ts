import { PrismaClient } from '@football-ai/database';
import { cacheService } from './cache';
import { config } from '../config';

const prisma = new PrismaClient();

interface TeamStatsData {
  id: string;
  teamId: number;
  leagueId: number;
  season: number;
  rank: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: string | null;
  team: {
    id: number;
    name: string;
    logo: string | null;
  };
}

interface H2HSummary {
  team1Wins: number;
  team2Wins: number;
  draws: number;
  totalGames: number;
}

class StatsService {
  /**
   * Get league standings (with Redis cache)
   * Cache TTL: 1 hour
   */
  async getStandings(leagueId: number, season: number): Promise<TeamStatsData[]> {
    const cacheKey = `standings:${leagueId}:${season}`;

    // Try cache first
    const cached = await cacheService.get<TeamStatsData[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const standings = await prisma.teamStats.findMany({
      where: {
        leagueId,
        season,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
      orderBy: {
        rank: 'asc',
      },
    });

    // Cache for 1 hour
    await cacheService.set(cacheKey, standings, 3600);

    return standings;
  }

  /**
   * Get team stats with form (last 5 matches)
   * Cache TTL: 30 minutes
   */
  async getTeamStats(
    teamId: number,
    leagueId: number,
    season: number
  ): Promise<{
    stats: TeamStatsData | null;
    form: Array<'W' | 'D' | 'L'>;
  }> {
    const cacheKey = `team:${teamId}:${leagueId}:${season}`;

    // Try cache first
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch stats from database
    const stats = await prisma.teamStats.findFirst({
      where: {
        teamId,
        leagueId,
        season,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    // Calculate form from last 5 matches
    const form = await this.calculateForm(teamId, leagueId, season);

    const result = {
      stats,
      form,
    };

    // Cache for 30 minutes
    await cacheService.set(cacheKey, result, 1800);

    return result;
  }

  /**
   * Get Head-to-Head statistics
   * Cache TTL: 2 hours
   */
  async getH2H(
    team1Id: number,
    team2Id: number
  ): Promise<{
    summary: H2HSummary | null;
    history: Array<any>;
  }> {
    // Normalize team IDs (smaller ID first for consistent cache key)
    const [t1, t2] = team1Id < team2Id ? [team1Id, team2Id] : [team2Id, team1Id];
    const cacheKey = `h2h:${t1}:${t2}`;

    // Try cache first
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch H2H record
    const h2hRecord = await prisma.h2HRecord.findFirst({
      where: {
        OR: [
          { team1Id: t1, team2Id: t2 },
          { team1Id: t2, team2Id: t1 },
        ],
      },
    });

    // Fetch last 10 matches between teams
    const history = await prisma.fixture.findMany({
      where: {
        OR: [
          { homeTeamId: team1Id, awayTeamId: team2Id },
          { homeTeamId: team2Id, awayTeamId: team1Id },
        ],
        status: 'FT', // Only finished matches
      },
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        league: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 10,
    });

    const result = {
      summary: h2hRecord
        ? {
            team1Wins: h2hRecord.team1Wins,
            team2Wins: h2hRecord.team2Wins,
            draws: h2hRecord.draws,
            totalGames: h2hRecord.totalGames,
          }
        : null,
      history,
    };

    // Cache for 2 hours
    await cacheService.set(cacheKey, result, 7200);

    return result;
  }

  /**
   * Calculate team form from last 5 matches
   */
  private async calculateForm(
    teamId: number,
    leagueId: number,
    season: number
  ): Promise<Array<'W' | 'D' | 'L'>> {
    const matches = await prisma.fixture.findMany({
      where: {
        leagueId,
        season,
        status: 'FT',
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId },
        ],
      },
      orderBy: {
        date: 'desc',
      },
      take: 5,
    });

    return matches.map((match) => this.calculateMatchResult(teamId, match));
  }

  /**
   * Calculate match result for a team (W/D/L)
   */
  private calculateMatchResult(
    teamId: number,
    match: any
  ): 'W' | 'D' | 'L' {
    const isHome = match.homeTeamId === teamId;
    const teamScore = isHome ? match.homeScore : match.awayScore;
    const opponentScore = isHome ? match.awayScore : match.homeScore;

    if (teamScore === null || opponentScore === null) {
      return 'L'; // Treat null scores as loss (shouldn't happen for FT matches)
    }

    if (teamScore > opponentScore) return 'W';
    if (teamScore === opponentScore) return 'D';
    return 'L';
  }
}

export const statsService = new StatsService();
