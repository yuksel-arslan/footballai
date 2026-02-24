import { PrismaClient } from '@football-ai/database'
import { cacheService } from './cache'
import { config } from '../config'

const prisma = new PrismaClient()

class StatsService {
  /** Get league standings */
  async getStandings(leagueId: number, season?: number) {
    const s = season || new Date().getFullYear()
    const cacheKey = `stats:standings:${leagueId}:${s}`

    const cached = await cacheService.get<any>(cacheKey)
    if (cached) return cached

    const standings = await prisma.teamStats.findMany({
      where: { leagueId, season: s },
      include: {
        team: { select: { id: true, name: true, logoUrl: true } },
      },
      orderBy: { leaguePosition: 'asc' },
    })

    await cacheService.set(cacheKey, standings, config.cache.standings)
    return standings
  }

  /** Get team statistics */
  async getTeamStats(teamId: number) {
    const cacheKey = `stats:team:${teamId}`

    const cached = await cacheService.get<any>(cacheKey)
    if (cached) return cached

    const stats = await prisma.teamStats.findMany({
      where: { teamId },
      include: {
        team: { select: { id: true, name: true, logoUrl: true } },
        league: { select: { id: true, name: true, logoUrl: true } },
      },
      orderBy: { season: 'desc' },
      take: 1,
    })

    const result = stats[0] || null
    await cacheService.set(cacheKey, result, config.cache.teamStats)
    return result
  }

  /** Get team form (last 5 matches) */
  async getTeamForm(teamId: number) {
    const cacheKey = `stats:form:${teamId}`

    const cached = await cacheService.get<any>(cacheKey)
    if (cached) return cached

    const matches = await prisma.fixture.findMany({
      where: {
        status: 'FINISHED',
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      include: {
        homeTeam: { select: { id: true, name: true, logoUrl: true } },
        awayTeam: { select: { id: true, name: true, logoUrl: true } },
        league: { select: { id: true, name: true } },
      },
      orderBy: { matchDate: 'desc' },
      take: 5,
    })

    const form = matches.map((m) => {
      const isHome = m.homeTeamId === teamId
      const teamScore = isHome ? m.homeScore : m.awayScore
      const oppScore = isHome ? m.awayScore : m.homeScore
      if (teamScore === null || oppScore === null) return 'L'
      if (teamScore > oppScore) return 'W'
      if (teamScore === oppScore) return 'D'
      return 'L'
    })

    const result = { form, matches }
    await cacheService.set(cacheKey, result, config.cache.teamForm)
    return result
  }

  /** Compare two teams */
  async compareTeams(team1Id: number, team2Id: number) {
    const cacheKey = `stats:compare:${Math.min(team1Id, team2Id)}:${Math.max(team1Id, team2Id)}`

    const cached = await cacheService.get<any>(cacheKey)
    if (cached) return cached

    const [team1Stats, team2Stats, h2h] = await Promise.all([
      this.getTeamStats(team1Id),
      this.getTeamStats(team2Id),
      this.getH2H(team1Id, team2Id),
    ])

    const result = { team1: team1Stats, team2: team2Stats, h2h }
    await cacheService.set(cacheKey, result, config.cache.compare)
    return result
  }

  /** Get head-to-head records */
  async getH2H(team1Id: number, team2Id: number) {
    const [t1, t2] = team1Id < team2Id ? [team1Id, team2Id] : [team2Id, team1Id]
    const cacheKey = `stats:h2h:${t1}:${t2}`

    const cached = await cacheService.get<any>(cacheKey)
    if (cached) return cached

    const h2hRecord = await prisma.h2HRecord.findFirst({
      where: {
        OR: [
          { team1Id: t1, team2Id: t2 },
          { team1Id: t2, team2Id: t1 },
        ],
      },
    })

    const history = await prisma.fixture.findMany({
      where: {
        OR: [
          { homeTeamId: team1Id, awayTeamId: team2Id },
          { homeTeamId: team2Id, awayTeamId: team1Id },
        ],
        status: 'FINISHED',
      },
      include: {
        homeTeam: { select: { id: true, name: true, logoUrl: true } },
        awayTeam: { select: { id: true, name: true, logoUrl: true } },
        league: { select: { id: true, name: true } },
      },
      orderBy: { matchDate: 'desc' },
      take: 10,
    })

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
    }

    await cacheService.set(cacheKey, result, config.cache.h2h)
    return result
  }
}

export const statsService = new StatsService()
