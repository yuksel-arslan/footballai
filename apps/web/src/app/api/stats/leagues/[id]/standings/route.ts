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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const leagueApiId = parseInt(id)

    // Find league by apiId or internal id
    const league = await prisma.league.findFirst({
      where: { OR: [{ apiId: leagueApiId }, { id: leagueApiId }] },
      select: { id: true },
    })

    if (!league) {
      return NextResponse.json({ success: true, data: [] })
    }

    const standings = await prisma.standing.findMany({
      where: { leagueId: league.id },
      include: {
        team: {
          select: {
            id: true,
            apiId: true,
            name: true,
            code: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    })

    const data = standings.map((s) => ({
      position: s.position,
      team: {
        id: s.team.apiId,
        name: s.team.name,
        code: s.team.code,
        logoUrl: s.team.logoUrl,
      },
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDifference: s.goalDifference,
      points: s.points,
      form: s.form?.split('').slice(-5) || [],
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Standings]', error)
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 502 }
    )
  }
}
