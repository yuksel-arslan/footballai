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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await params
    const apiLeagueId = parseInt(leagueId)

    // Find league by apiId
    const league = await prisma.league.findFirst({
      where: { OR: [{ apiId: apiLeagueId }, { id: apiLeagueId }] },
      select: { id: true },
    })

    if (!league) {
      return NextResponse.json({ success: true, data: [] })
    }

    const fixtures = await prisma.fixture.findMany({
      where: {
        leagueId: league.id,
        status: { in: ['SCHEDULED', 'LIVE', 'HALFTIME'] },
        matchDate: { gte: new Date() },
      },
      include: {
        homeTeam: {
          select: {
            id: true,
            apiId: true,
            name: true,
            logoUrl: true,
            code: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            apiId: true,
            name: true,
            logoUrl: true,
            code: true,
          },
        },
        league: {
          select: {
            id: true,
            apiId: true,
            name: true,
            country: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { matchDate: 'asc' },
      take: 20,
    })

    const data = fixtures.map((f) => ({
      id: f.apiId,
      apiId: f.apiId,
      homeTeam: {
        id: f.homeTeam.apiId,
        name: f.homeTeam.name,
        code: f.homeTeam.code,
        logoUrl: f.homeTeam.logoUrl,
      },
      awayTeam: {
        id: f.awayTeam.apiId,
        name: f.awayTeam.name,
        code: f.awayTeam.code,
        logoUrl: f.awayTeam.logoUrl,
      },
      league: {
        id: f.league.apiId,
        name: f.league.name,
        country: f.league.country,
        logoUrl: f.league.logoUrl,
      },
      matchDate: f.matchDate.toISOString(),
      status: f.status,
      homeScore: f.homeScore,
      awayScore: f.awayScore,
      venue: f.venue,
      round: f.round,
      minute: f.minute,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Fixtures by league]', error)
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 502 }
    )
  }
}
