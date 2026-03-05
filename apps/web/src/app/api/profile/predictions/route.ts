import { NextRequest, NextResponse } from 'next/server'
import { USER_SERVICE_URL } from '@/lib/service-urls'
import { verifyToken } from '@/lib/auth-service'
import {
  getUserPredictions,
  createUserPrediction,
  ensureFixtureInDB,
} from '@/lib/db-service'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '20'

    // Try backend service first if configured
    if (USER_SERVICE_URL) {
      try {
        const res = await fetch(
          `${USER_SERVICE_URL}/api/profile/predictions?page=${page}&limit=${limit}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            signal: AbortSignal.timeout(5000),
          }
        )

        if (res.ok) {
          const data = await res.json()
          return NextResponse.json(data, { status: res.status })
        }
      } catch {
        // Backend unavailable, fall through to direct DB
      }
    }

    // Direct DB fallback
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const result = await getUserPredictions(
      decoded.userId,
      parseInt(page),
      parseInt(limit)
    )
    return NextResponse.json(result)
  } catch (error) {
    console.error('Predictions GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 502 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Try backend service first if configured
    if (USER_SERVICE_URL) {
      try {
        const res = await fetch(`${USER_SERVICE_URL}/api/profile/predictions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(5000),
        })

        if (res.ok) {
          const data = await res.json()
          return NextResponse.json(data, { status: res.status })
        }
      } catch {
        // Backend unavailable, fall through to direct DB
      }
    }

    // Direct DB fallback
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Ensure fixture exists in DB (resolves external API ID → DB ID)
    let dbFixtureId: number | null = null

    if (body.fixtureId) {
      if (body.matchData) {
        // Frontend sent match metadata — use it to ensure fixture in DB
        const { fixture } = await ensureFixtureInDB({
          apiId: body.fixtureId,
          homeTeam: body.matchData.homeTeam,
          awayTeam: body.matchData.awayTeam,
          league: body.matchData.league,
          matchDate: body.matchData.matchDate || new Date().toISOString(),
          status: body.matchData.status,
          venue: body.matchData.venue,
          round: body.matchData.round,
        })
        dbFixtureId = fixture.id
      } else {
        // No metadata — try to find by apiId, fall back to direct ID
        const existing = await prisma.fixture.findUnique({
          where: { apiId: body.fixtureId },
        })
        dbFixtureId = existing?.id ?? null
      }
    }

    // Look up or create the AI prediction record
    if (dbFixtureId && !body.predictionId) {
      const aiPrediction = await prisma.prediction.findFirst({
        where: { fixtureId: dbFixtureId },
        orderBy: { createdAt: 'desc' },
      })
      if (aiPrediction) {
        body.predictionId = aiPrediction.id
      } else {
        // Create a placeholder prediction record
        const placeholder = await prisma.prediction.create({
          data: {
            fixtureId: dbFixtureId,
            modelVersion: 'user-only',
            homeWinProb: 33.3,
            drawProb: 33.3,
            awayWinProb: 33.3,
            predictedHomeScore: 0,
            predictedAwayScore: 0,
            confidence: 0,
            features: {},
          },
        })
        body.predictionId = placeholder.id
      }
    }

    // Use DB fixture ID (not the external API ID)
    const result = await createUserPrediction(decoded.userId, {
      ...body,
      fixtureId: dbFixtureId ?? body.fixtureId,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Predictions POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 502 }
    )
  }
}
