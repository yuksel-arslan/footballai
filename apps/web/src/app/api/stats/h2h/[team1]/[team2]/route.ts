import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ team1: string; team2: string }> }
) {
  try {
    const { team1, team2 } = await params
    const team1Id = parseInt(team1)
    const team2Id = parseInt(team2)

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
          return NextResponse.json(data, { status: res.status })
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
        homeTeam: { select: { id: true, name: true, logoUrl: true, code: true } },
        awayTeam: { select: { id: true, name: true, logoUrl: true, code: true } },
        league: { select: { id: true, name: true } },
      },
      orderBy: { matchDate: 'desc' },
      take: 10,
    })

    // Build summary from H2H record or compute from fixtures
    let summary = null
    if (h2hRecord) {
      // If stored record has teams in reverse order, swap wins
      const isReversed = h2hRecord.team1Id === team2Id
      summary = {
        team1Wins: isReversed ? h2hRecord.team2Wins : h2hRecord.team1Wins,
        team2Wins: isReversed ? h2hRecord.team1Wins : h2hRecord.team2Wins,
        draws: h2hRecord.draws,
        totalGames: h2hRecord.totalGames,
      }
    } else if (history.length > 0) {
      // Compute from fixture history
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
