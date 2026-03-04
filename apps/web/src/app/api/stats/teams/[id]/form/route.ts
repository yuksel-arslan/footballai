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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const teamId = parseInt(id)

    // Try gateway first if configured
    if (GATEWAY_URL) {
      try {
        const res = await fetch(
          `${GATEWAY_URL}/api/stats/teams/${id}/form`,
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

    // Direct DB fallback - try TeamStats first for cached form
    const currentYear = new Date().getFullYear()
    const teamStats = await prisma.teamStats.findFirst({
      where: { teamId, season: { in: [currentYear, currentYear - 1] } },
      orderBy: { season: 'desc' },
    })

    // Get last 5 finished matches for this team
    const recentMatches = await prisma.fixture.findMany({
      where: {
        status: 'FINISHED',
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      include: {
        homeTeam: { select: { id: true, name: true, logoUrl: true, code: true } },
        awayTeam: { select: { id: true, name: true, logoUrl: true, code: true } },
        league: { select: { id: true, name: true } },
      },
      orderBy: { matchDate: 'desc' },
      take: 5,
    })

    // Compute form from recent matches
    let form: string[] = []
    if (teamStats?.lastFiveForm) {
      form = teamStats.lastFiveForm.split('')
    } else if (recentMatches.length > 0) {
      form = recentMatches.map((match) => {
        const isHome = match.homeTeamId === teamId
        const teamScore = isHome ? match.homeScore : match.awayScore
        const oppScore = isHome ? match.awayScore : match.homeScore
        if (teamScore === null || oppScore === null) return '-'
        if (teamScore > oppScore) return 'W'
        if (teamScore < oppScore) return 'L'
        return 'D'
      })
    }

    return NextResponse.json({
      success: true,
      data: { form, matches: recentMatches },
    })
  } catch (error) {
    console.error('[Team Form]', error)
    return NextResponse.json(
      { success: false, error: 'Stats service unavailable' },
      { status: 502 }
    )
  }
}
