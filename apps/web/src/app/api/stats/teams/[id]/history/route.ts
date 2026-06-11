import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { resolveTeamIdByName } from '@/lib/team-name'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    process.env.APP_DATABASE_URL
      ? { datasourceUrl: process.env.APP_DATABASE_URL }
      : undefined
  )
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * GET /api/stats/teams/:id/history?limit=15
 *
 * Industry-standard historical stats derived ON THE FLY from finished
 * fixtures (works for any team we've imported, incl. national sides — not
 * limited to the 5 leagues that populate TeamStats). `id` may be an
 * API-Football id or an internal id; both are resolved.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const n = Number(id)
    const name = request.nextUrl.searchParams.get('name')
    const limit = Math.min(
      Math.max(Number(request.nextUrl.searchParams.get('limit')) || 15, 5),
      30
    )

    // Resolve by NAME first (reliable across providers); the numeric id from
    // the displayed fixture may be a foreign-provider id that collides with a
    // different team's internal id. Fall back to apiId only (never bare id).
    let team: { id: number; name: string; logoUrl: string | null } | null = null
    if (name) {
      const all = await prisma.team.findMany({
        select: { id: true, name: true },
      })
      const resolvedId = resolveTeamIdByName(name, all)
      if (resolvedId != null) {
        team = await prisma.team.findUnique({
          where: { id: resolvedId },
          select: { id: true, name: true, logoUrl: true },
        })
      }
    }
    if (!team && Number.isFinite(n)) {
      team = await prisma.team.findUnique({
        where: { apiId: n },
        select: { id: true, name: true, logoUrl: true },
      })
    }
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'team_not_found' },
        { status: 404 }
      )
    }

    const fixtures = await prisma.fixture.findMany({
      where: {
        status: 'FINISHED',
        homeScore: { not: null },
        awayScore: { not: null },
        OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
      },
      include: {
        homeTeam: { select: { id: true, name: true, logoUrl: true } },
        awayTeam: { select: { id: true, name: true, logoUrl: true } },
        league: { select: { id: true, name: true } },
      },
      orderBy: { matchDate: 'desc' },
      take: limit,
    })

    let wins = 0
    let draws = 0
    let losses = 0
    let goalsFor = 0
    let goalsAgainst = 0
    let cleanSheets = 0
    let failedToScore = 0
    const form: string[] = []
    const recent = fixtures.map((m) => {
      const isHome = m.homeTeamId === team.id
      const gf = (isHome ? m.homeScore : m.awayScore) as number
      const ga = (isHome ? m.awayScore : m.homeScore) as number
      goalsFor += gf
      goalsAgainst += ga
      if (ga === 0) cleanSheets++
      if (gf === 0) failedToScore++
      let r: 'W' | 'D' | 'L'
      if (gf > ga) {
        wins++
        r = 'W'
      } else if (gf < ga) {
        losses++
        r = 'L'
      } else {
        draws++
        r = 'D'
      }
      form.push(r)
      return {
        id: m.id,
        result: r,
        gf,
        ga,
        isHome,
        opponent: isHome ? m.awayTeam.name : m.homeTeam.name,
        opponentLogo: isHome ? m.awayTeam.logoUrl : m.homeTeam.logoUrl,
        matchDate: m.matchDate,
        league: m.league.name,
      }
    })

    const played = fixtures.length
    const round1 = (x: number) => Math.round(x * 10) / 10
    const data = {
      team,
      played,
      wins,
      draws,
      losses,
      winRate: played ? Math.round((wins / played) * 100) : 0,
      goalsFor,
      goalsAgainst,
      avgGoalsFor: played ? round1(goalsFor / played) : 0,
      avgGoalsAgainst: played ? round1(goalsAgainst / played) : 0,
      cleanSheets,
      failedToScore,
      bttsRate: played
        ? Math.round(
            (recent.filter((m) => m.gf > 0 && m.ga > 0).length / played) * 100
          )
        : 0,
      // last 5, most recent first
      form: form.slice(0, 5),
      recent: recent.slice(0, 6),
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Team History]', error)
    return NextResponse.json(
      { success: false, error: 'history_unavailable' },
      { status: 502 }
    )
  }
}
