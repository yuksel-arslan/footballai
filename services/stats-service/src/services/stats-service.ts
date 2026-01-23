import { PrismaClient, FixtureStatus } from '@football-ai/database'
import { cache } from './cache'
import { config } from '@/config'

const prisma = new PrismaClient()

export interface TeamStatsResponse {
  team: {
    id: number
    name: string
    logoUrl: string | null
    country: string
  }
  season: number
  stats: {
    matchesPlayed: number
    wins: number
    draws: number
    losses: number
    goalsFor: number
    goalsAgainst: number
    goalDifference: number
    cleanSheets: number
    homeWins: number
    awayWins: number
    form: string | null
    leaguePosition: number | null
    points: number
  }
}

export interface StandingsEntry {
  position: number
  team: {
    id: number
    name: string
    logoUrl: string | null
  }
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  form: string | null
}

export interface H2HResponse {
  team1: {
    id: number
    name: string
    logoUrl: string | null
  }
  team2: {
    id: number
    name: string
    logoUrl: string | null
  }
  stats: {
    totalMatches: number
    team1Wins: number
    team2Wins: number
    draws: number
  }
  lastMatches: Array<{
    date: Date
    homeTeam: string
    awayTeam: string
    homeScore: number
    awayScore: number
  }>
}

export interface CompareTeamsResponse {
  team1: TeamStatsResponse
  team2: TeamStatsResponse
  h2h: H2HResponse
}

class StatsService {
  // Get team statistics
  async getTeamStats(teamId: number, season?: number): Promise<TeamStatsResponse> {
    const targetSeason = season || config.currentSeason
    const cacheKey = cache.key('team', teamId, targetSeason)

    // Check cache
    const cached = await cache.get<TeamStatsResponse>(cacheKey)
    if (cached) return cached

    // Get team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        country: true,
      },
    })

    if (!team) {
      throw new Error(`Team not found: ${teamId}`)
    }

    // Get or calculate stats
    let stats = await prisma.teamStats.findUnique({
      where: {
        teamId_season: {
          teamId,
          season: targetSeason,
        },
      },
    })

    // If no stats exist, calculate from fixtures
    if (!stats) {
      stats = await this.calculateTeamStats(teamId, targetSeason)
    }

    const response: TeamStatsResponse = {
      team,
      season: targetSeason,
      stats: {
        matchesPlayed: stats.matchesPlayed,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        goalsFor: stats.goalsFor,
        goalsAgainst: stats.goalsAgainst,
        goalDifference: stats.goalsFor - stats.goalsAgainst,
        cleanSheets: stats.cleanSheets,
        homeWins: stats.homeWins,
        awayWins: stats.awayWins,
        form: stats.lastFiveForm,
        leaguePosition: stats.leaguePosition,
        points: stats.points,
      },
    }

    // Cache response
    await cache.set(cacheKey, response, config.cache.teamStats)

    return response
  }

  // Calculate team stats from fixtures
  async calculateTeamStats(teamId: number, season: number) {
    const fixtures = await prisma.fixture.findMany({
      where: {
        season,
        status: FixtureStatus.FINISHED,
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      orderBy: { matchDate: 'desc' },
    })

    let wins = 0,
      draws = 0,
      losses = 0
    let goalsFor = 0,
      goalsAgainst = 0,
      cleanSheets = 0
    let homeWins = 0,
      awayWins = 0

    const formResults: string[] = []

    for (const fixture of fixtures) {
      const isHome = fixture.homeTeamId === teamId
      const teamScore = isHome ? fixture.homeScore || 0 : fixture.awayScore || 0
      const opponentScore = isHome ? fixture.awayScore || 0 : fixture.homeScore || 0

      goalsFor += teamScore
      goalsAgainst += opponentScore

      if (opponentScore === 0) cleanSheets++

      if (teamScore > opponentScore) {
        wins++
        if (isHome) homeWins++
        else awayWins++
        if (formResults.length < 5) formResults.push('W')
      } else if (teamScore < opponentScore) {
        losses++
        if (formResults.length < 5) formResults.push('L')
      } else {
        draws++
        if (formResults.length < 5) formResults.push('D')
      }
    }

    const stats = await prisma.teamStats.upsert({
      where: {
        teamId_season: { teamId, season },
      },
      create: {
        teamId,
        season,
        matchesPlayed: fixtures.length,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        cleanSheets,
        homeWins,
        awayWins,
        lastFiveForm: formResults.join(''),
        points: wins * 3 + draws,
      },
      update: {
        matchesPlayed: fixtures.length,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        cleanSheets,
        homeWins,
        awayWins,
        lastFiveForm: formResults.join(''),
        points: wins * 3 + draws,
      },
    })

    return stats
  }

  // Get team form (last N matches)
  async getTeamForm(teamId: number, lastN: number = 5) {
    const cacheKey = cache.key('form', teamId, lastN)

    const cached = await cache.get<any>(cacheKey)
    if (cached) return cached

    const fixtures = await prisma.fixture.findMany({
      where: {
        status: FixtureStatus.FINISHED,
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      orderBy: { matchDate: 'desc' },
      take: lastN,
      include: {
        homeTeam: { select: { id: true, name: true, logoUrl: true } },
        awayTeam: { select: { id: true, name: true, logoUrl: true } },
        league: { select: { id: true, name: true } },
      },
    })

    const form = fixtures.map((f) => {
      const isHome = f.homeTeamId === teamId
      const teamScore = isHome ? f.homeScore || 0 : f.awayScore || 0
      const opponentScore = isHome ? f.awayScore || 0 : f.homeScore || 0

      let result: 'W' | 'D' | 'L'
      if (teamScore > opponentScore) result = 'W'
      else if (teamScore < opponentScore) result = 'L'
      else result = 'D'

      return {
        fixtureId: f.id,
        date: f.matchDate,
        opponent: isHome ? f.awayTeam : f.homeTeam,
        isHome,
        score: { team: teamScore, opponent: opponentScore },
        result,
        league: f.league,
      }
    })

    const response = {
      teamId,
      matches: form,
      summary: {
        played: form.length,
        wins: form.filter((f) => f.result === 'W').length,
        draws: form.filter((f) => f.result === 'D').length,
        losses: form.filter((f) => f.result === 'L').length,
        formString: form.map((f) => f.result).join(''),
      },
    }

    await cache.set(cacheKey, response, config.cache.form)

    return response
  }

  // Get league standings
  async getLeagueStandings(leagueId: number, season?: number): Promise<StandingsEntry[]> {
    const targetSeason = season || config.currentSeason
    const cacheKey = cache.key('standings', leagueId, targetSeason)

    const cached = await cache.get<StandingsEntry[]>(cacheKey)
    if (cached) return cached

    // Get all teams in league with their stats
    const teamsWithStats = await prisma.team.findMany({
      where: { leagueId },
      include: {
        teamStats: {
          where: { season: targetSeason },
        },
      },
    })

    // Build standings
    const standings: StandingsEntry[] = teamsWithStats
      .map((team) => {
        const stats = team.teamStats[0]
        return {
          position: stats?.leaguePosition || 0,
          team: {
            id: team.id,
            name: team.name,
            logoUrl: team.logoUrl,
          },
          played: stats?.matchesPlayed || 0,
          won: stats?.wins || 0,
          drawn: stats?.draws || 0,
          lost: stats?.losses || 0,
          goalsFor: stats?.goalsFor || 0,
          goalsAgainst: stats?.goalsAgainst || 0,
          goalDifference: (stats?.goalsFor || 0) - (stats?.goalsAgainst || 0),
          points: stats?.points || 0,
          form: stats?.lastFiveForm || null,
        }
      })
      .sort((a, b) => {
        // Sort by points, then goal difference, then goals for
        if (b.points !== a.points) return b.points - a.points
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
        return b.goalsFor - a.goalsFor
      })
      .map((entry, index) => ({ ...entry, position: index + 1 }))

    // Update positions in database
    for (const entry of standings) {
      await prisma.teamStats.updateMany({
        where: {
          teamId: entry.team.id,
          season: targetSeason,
        },
        data: {
          leaguePosition: entry.position,
        },
      })
    }

    await cache.set(cacheKey, standings, config.cache.standings)

    return standings
  }

  // Get head-to-head records
  async getH2H(team1Id: number, team2Id: number): Promise<H2HResponse> {
    // Ensure consistent ordering for cache key
    const [id1, id2] = team1Id < team2Id ? [team1Id, team2Id] : [team2Id, team1Id]
    const cacheKey = cache.key('h2h', id1, id2)

    const cached = await cache.get<H2HResponse>(cacheKey)
    if (cached) return cached

    // Get teams
    const [team1, team2] = await Promise.all([
      prisma.team.findUnique({
        where: { id: team1Id },
        select: { id: true, name: true, logoUrl: true },
      }),
      prisma.team.findUnique({
        where: { id: team2Id },
        select: { id: true, name: true, logoUrl: true },
      }),
    ])

    if (!team1 || !team2) {
      throw new Error('One or both teams not found')
    }

    // Get H2H record from database
    let h2hRecord = await prisma.h2HRecord.findUnique({
      where: {
        team1Id_team2Id: { team1Id: id1, team2Id: id2 },
      },
    })

    // Get last matches between teams
    const lastMatches = await prisma.fixture.findMany({
      where: {
        status: FixtureStatus.FINISHED,
        OR: [
          { homeTeamId: team1Id, awayTeamId: team2Id },
          { homeTeamId: team2Id, awayTeamId: team1Id },
        ],
      },
      orderBy: { matchDate: 'desc' },
      take: 10,
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    })

    // Calculate H2H stats if not in database
    if (!h2hRecord && lastMatches.length > 0) {
      let team1Wins = 0,
        team2Wins = 0,
        draws = 0

      for (const match of lastMatches) {
        const homeScore = match.homeScore || 0
        const awayScore = match.awayScore || 0
        const homeIsTeam1 = match.homeTeamId === team1Id

        if (homeScore > awayScore) {
          if (homeIsTeam1) team1Wins++
          else team2Wins++
        } else if (awayScore > homeScore) {
          if (homeIsTeam1) team2Wins++
          else team1Wins++
        } else {
          draws++
        }
      }

      h2hRecord = await prisma.h2HRecord.upsert({
        where: {
          team1Id_team2Id: { team1Id: id1, team2Id: id2 },
        },
        create: {
          team1Id: id1,
          team2Id: id2,
          team1Wins: id1 === team1Id ? team1Wins : team2Wins,
          team2Wins: id1 === team1Id ? team2Wins : team1Wins,
          draws,
          lastFive: lastMatches.slice(0, 5).map((m) => ({
            date: m.matchDate,
            home: m.homeTeam.name,
            away: m.awayTeam.name,
            score: `${m.homeScore}-${m.awayScore}`,
          })),
        },
        update: {
          team1Wins: id1 === team1Id ? team1Wins : team2Wins,
          team2Wins: id1 === team1Id ? team2Wins : team1Wins,
          draws,
          lastFive: lastMatches.slice(0, 5).map((m) => ({
            date: m.matchDate,
            home: m.homeTeam.name,
            away: m.awayTeam.name,
            score: `${m.homeScore}-${m.awayScore}`,
          })),
        },
      })
    }

    const response: H2HResponse = {
      team1,
      team2,
      stats: {
        totalMatches: lastMatches.length,
        team1Wins: h2hRecord
          ? id1 === team1Id
            ? h2hRecord.team1Wins
            : h2hRecord.team2Wins
          : 0,
        team2Wins: h2hRecord
          ? id1 === team1Id
            ? h2hRecord.team2Wins
            : h2hRecord.team1Wins
          : 0,
        draws: h2hRecord?.draws || 0,
      },
      lastMatches: lastMatches.map((m) => ({
        date: m.matchDate,
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        homeScore: m.homeScore || 0,
        awayScore: m.awayScore || 0,
      })),
    }

    await cache.set(cacheKey, response, config.cache.h2h)

    return response
  }

  // Compare two teams
  async compareTeams(team1Id: number, team2Id: number): Promise<CompareTeamsResponse> {
    const [team1Stats, team2Stats, h2h] = await Promise.all([
      this.getTeamStats(team1Id),
      this.getTeamStats(team2Id),
      this.getH2H(team1Id, team2Id),
    ])

    return {
      team1: team1Stats,
      team2: team2Stats,
      h2h,
    }
  }

  // Recalculate all stats for a season
  async recalculateAllStats(season: number): Promise<{ updated: number }> {
    const teams = await prisma.team.findMany({
      select: { id: true },
    })

    let updated = 0
    for (const team of teams) {
      await this.calculateTeamStats(team.id, season)
      updated++
    }

    // Clear cache
    await cache.clear('stats:*')

    return { updated }
  }
}

export const statsService = new StatsService()
