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
    const fixtureId = parseInt(id)

    // Try gateway first if configured
    if (GATEWAY_URL) {
      try {
        const res = await fetch(`${GATEWAY_URL}/api/fixtures/${fixtureId}`, {
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(15000),
        })

        if (res.ok) {
          const data = await res.json()
          return NextResponse.json(data, { status: res.status })
        }
      } catch {
        // Gateway unavailable, fall through to direct DB
      }
    }

    // Direct DB fallback
    const fixture = await prisma.fixture.findFirst({
      where: {
        OR: [{ id: fixtureId }, { apiId: fixtureId }],
      },
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            code: true,
            country: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            code: true,
            country: true,
          },
        },
        league: {
          select: { id: true, name: true, country: true, logoUrl: true },
        },
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!fixture) {
      return NextResponse.json(
        { success: false, error: 'Fixture not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: fixture.id,
        apiId: fixture.apiId,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        league: fixture.league,
        matchDate: fixture.matchDate.toISOString(),
        status: fixture.status,
        homeScore: fixture.homeScore,
        awayScore: fixture.awayScore,
        venue: fixture.venue,
        referee: fixture.referee,
        round: fixture.round,
        minute: fixture.minute,
        predictions: fixture.predictions.map((p) => ({
          homeWinProb: p.homeWinProb,
          drawProb: p.drawProb,
          awayWinProb: p.awayWinProb,
          predictedHomeScore: p.predictedHomeScore,
          predictedAwayScore: p.predictedAwayScore,
          confidence: p.confidence,
          explanation: p.explanation,
          keyFactors: p.keyFactors,
          modelVersion: p.modelVersion,
        })),
      },
    })
  } catch (error) {
    console.error('[Fixture]', error)
    return NextResponse.json(
      { success: false, error: 'Fixture service unavailable' },
      { status: 502 }
    )
  }
}
