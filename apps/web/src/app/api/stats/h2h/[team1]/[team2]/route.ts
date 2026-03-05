import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// API-Football proxy URL for fetching H2H from external API
const PROXY_URL = '/api/football'

async function fetchH2HFromApiFootball(
  team1Id: number,
  team2Id: number
): Promise<{ summary: any; history: any[] } | null> {
  try {
    // API-Football uses /fixtures/headtohead?h2h={team1}-{team2}
    const endpoint = `/fixtures/headtohead?h2h=${team1Id}-${team2Id}&last=10`
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'
    const res = await fetch(
      `${baseUrl}${PROXY_URL}?endpoint=${encodeURIComponent(endpoint)}&source=api-football`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.response?.length) return null

    let team1Wins = 0
    let team2Wins = 0
    let draws = 0

    const history = data.response.map((m: any) => {
      const homeScore = m.goals?.home ?? m.score?.fulltime?.home
      const awayScore = m.goals?.away ?? m.score?.fulltime?.away
      const homeId = m.teams?.home?.id
      const isTeam1Home = homeId === team1Id

      if (homeScore != null && awayScore != null) {
        if (homeScore > awayScore) {
          if (isTeam1Home) team1Wins++
          else team2Wins++
        } else if (homeScore < awayScore) {
          if (isTeam1Home) team2Wins++
          else team1Wins++
        } else {
          draws++
        }
      }

      return {
        id: m.fixture?.id,
        homeTeam: {
          id: m.teams?.home?.id,
          name: m.teams?.home?.name,
          logoUrl: m.teams?.home?.logo,
        },
        awayTeam: {
          id: m.teams?.away?.id,
          name: m.teams?.away?.name,
          logoUrl: m.teams?.away?.logo,
        },
        homeScore,
        awayScore,
        matchDate: m.fixture?.date,
        status: 'FINISHED',
        league: {
          id: m.league?.id,
          name: m.league?.name,
        },
      }
    })

    const totalGames = team1Wins + team2Wins + draws
    return {
      summary:
        totalGames > 0 ? { team1Wins, team2Wins, draws, totalGames } : null,
      history,
    }
  } catch (err) {
    console.warn('[H2H] API-Football fallback failed:', err)
    return null
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ team1: string; team2: string }> }
) {
  try {
    const { team1, team2 } = await params
    const team1ApiId = parseInt(team1)
    const team2ApiId = parseInt(team2)

    // Resolve API team IDs to internal DB IDs
    const [dbTeam1, dbTeam2] = await Promise.all([
      prisma.team.findUnique({ where: { apiId: team1ApiId }, select: { id: true } }),
      prisma.team.findUnique({ where: { apiId: team2ApiId }, select: { id: true } }),
    ])
    const team1Id = dbTeam1?.id ?? team1ApiId
    const team2Id = dbTeam2?.id ?? team2ApiId

    // Try gateway first if configured
    if (GATEWAY_URL) {
      try {
        const res = await fetch(
          `${GATEWAY_URL}/api/stats/h2h/${team1}/${team2}`,
          {
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(15000),
          }
        )

        if (res.ok) {
          const data = await res.json()
          // Only use gateway result if it actually has data
          if (data?.data?.summary || data?.data?.history?.length > 0) {
            return NextResponse.json(data, { status: res.status })
          }
        }
      } catch {
        // Gateway unavailable, fall through to direct DB
      }
    }

    // Direct DB fallback - check H2HRecord table
    const h2hRecord = await prisma.h2HRecord.findFirst({
      where: {
        OR: [
          { team1Id: team1Id, team2Id: team2Id },
          { team1Id: team2Id, team2Id: team1Id },
        ],
      },
    })

    // Get recent matches between these teams
    const history = await prisma.fixture.findMany({
      where: {
        status: 'FINISHED',
        OR: [
          { homeTeamId: team1Id, awayTeamId: team2Id },
          { homeTeamId: team2Id, awayTeamId: team1Id },
        ],
      },
      include: {
        homeTeam: {
          select: { id: true, name: true, logoUrl: true, code: true },
        },
        awayTeam: {
          select: { id: true, name: true, logoUrl: true, code: true },
        },
        league: { select: { id: true, name: true } },
      },
      orderBy: { matchDate: 'desc' },
      take: 10,
    })

    // Build summary from H2H record or compute from fixtures
    let summary = null
    if (h2hRecord) {
      const isReversed = h2hRecord.team1Id === team2Id
      summary = {
        team1Wins: isReversed ? h2hRecord.team2Wins : h2hRecord.team1Wins,
        team2Wins: isReversed ? h2hRecord.team1Wins : h2hRecord.team2Wins,
        draws: h2hRecord.draws,
        totalGames: h2hRecord.totalGames,
      }
    } else if (history.length > 0) {
      let team1Wins = 0
      let team2Wins = 0
      let draws = 0
      for (const match of history) {
        if (match.homeScore === null || match.awayScore === null) continue
        const isTeam1Home = match.homeTeamId === team1Id
        if (match.homeScore > match.awayScore) {
          if (isTeam1Home) team1Wins++
          else team2Wins++
        } else if (match.homeScore < match.awayScore) {
          if (isTeam1Home) team2Wins++
          else team1Wins++
        } else {
          draws++
        }
      }
      summary = {
        team1Wins,
        team2Wins,
        draws,
        totalGames: team1Wins + team2Wins + draws,
      }
    }

    // If no data from DB, try external API-Football as fallback (using API IDs)
    if (!summary && history.length === 0) {
      const externalH2H = await fetchH2HFromApiFootball(team1ApiId, team2ApiId)
      if (externalH2H) {
        return NextResponse.json({
          success: true,
          data: externalH2H,
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: { summary, history },
    })
  } catch (error) {
    console.error('[H2H]', error)
    return NextResponse.json(
      { success: false, error: 'Stats service unavailable' },
      { status: 502 }
    )
  }
}
