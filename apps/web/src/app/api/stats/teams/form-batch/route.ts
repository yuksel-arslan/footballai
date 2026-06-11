import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

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
 * GET /api/stats/teams/form-batch?ids=39,140,...
 *
 * Last-5 form (W/D/L) for many teams in one request — used by the matches
 * list so it doesn't fire one request per row. ids are API-Football ids;
 * response is keyed by the SAME id passed in. Derived from finished fixtures.
 */
export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get('ids') || ''
    const apiIds = [
      ...new Set(
        raw
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n > 0)
      ),
    ].slice(0, 60)
    if (apiIds.length === 0)
      return NextResponse.json({ success: true, data: {} })

    const teams = await prisma.team.findMany({
      where: { apiId: { in: apiIds } },
      select: { id: true, apiId: true },
    })

    const result: Record<number, ('W' | 'D' | 'L')[]> = {}
    await Promise.all(
      teams.map(async (t) => {
        const fixtures = await prisma.fixture.findMany({
          where: {
            status: 'FINISHED',
            homeScore: { not: null },
            awayScore: { not: null },
            OR: [{ homeTeamId: t.id }, { awayTeamId: t.id }],
          },
          select: {
            homeTeamId: true,
            homeScore: true,
            awayScore: true,
          },
          orderBy: { matchDate: 'desc' },
          take: 5,
        })
        const form = fixtures.map((m) => {
          const isHome = m.homeTeamId === t.id
          const gf = (isHome ? m.homeScore : m.awayScore) as number
          const ga = (isHome ? m.awayScore : m.homeScore) as number
          return gf > ga ? 'W' : gf < ga ? 'L' : 'D'
        }) as ('W' | 'D' | 'L')[]
        if (form.length) result[t.apiId] = form
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
