import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { normalizeTeam, resolveTeamIdByName } from '@/lib/team-name'

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
 * GET /api/stats/teams/form-batch?names=Mexico,South%20Africa,...
 *
 * Last-5 form (W/D/L) for many teams in one request — used by the matches
 * list so it doesn't fire one request per row. Resolved by NAME (reliable
 * across providers) and returned keyed by the NORMALIZED team name.
 * Derived from finished fixtures.
 */
export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get('names') || ''
    const names = [
      ...new Set(
        raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    ].slice(0, 60)
    if (names.length === 0)
      return NextResponse.json({ success: true, data: {} })

    const teams = await prisma.team.findMany({
      select: { id: true, name: true },
    })

    const result: Record<string, ('W' | 'D' | 'L')[]> = {}
    await Promise.all(
      names.map(async (name) => {
        const teamId = resolveTeamIdByName(name, teams)
        if (teamId == null) return
        const fixtures = await prisma.fixture.findMany({
          where: {
            status: 'FINISHED',
            homeScore: { not: null },
            awayScore: { not: null },
            OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
          },
          select: { homeTeamId: true, homeScore: true, awayScore: true },
          orderBy: { matchDate: 'desc' },
          take: 5,
        })
        const form = fixtures.map((m) => {
          const isHome = m.homeTeamId === teamId
          const gf = (isHome ? m.homeScore : m.awayScore) as number
          const ga = (isHome ? m.awayScore : m.homeScore) as number
          return gf > ga ? 'W' : gf < ga ? 'L' : 'D'
        }) as ('W' | 'D' | 'L')[]
        if (form.length) result[normalizeTeam(name)] = form
      })
    )

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[Form Batch]', error)
    return NextResponse.json(
      { success: false, error: 'form_batch_unavailable' },
      { status: 502 }
    )
  }
}
