import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'
import { generatePrediction, type MatchData } from '@/lib/gemini'
import { notifyPrediction } from '@/lib/telegram'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  try {
    const { fixtureId } = await params
    const token = request.headers.get('authorization') || ''

    // Try gateway first if configured
    if (GATEWAY_URL) {
      try {
        const res = await fetch(`${GATEWAY_URL}/api/predictions/${fixtureId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: token } : {}),
          },
          signal: AbortSignal.timeout(10000),
        })

        if (res.ok) {
          const data = await res.json()
          return NextResponse.json(data, { status: res.status })
        }
      } catch {
        // Gateway unavailable, fall through to direct DB + AI
      }
    }

    // Direct fallback: look up fixture and generate prediction
    const id = parseInt(fixtureId)
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid fixture ID' },
        { status: 400 }
      )
    }

    // Check DB for existing prediction
    const existing = await prisma.prediction.findFirst({
      where: { fixtureId: id },
      orderBy: { createdAt: 'desc' },
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        prediction: {
          homeWinProb: existing.homeWinProb,
          drawProb: existing.drawProb,
          awayWinProb: existing.awayWinProb,
          predictedHomeScore: existing.predictedHomeScore,
          predictedAwayScore: existing.predictedAwayScore,
          confidence: existing.confidence,
          analysis: existing.explanation,
          keyFactors: existing.keyFactors,
          model: existing.modelVersion,
        },
      })
    }

    // No existing prediction - fetch fixture and generate one
    const fixture = await prisma.fixture.findUnique({
      where: { id },
      include: {
        homeTeam: true,
        awayTeam: true,
        league: true,
      },
    })

    if (!fixture) {
      return NextResponse.json(
        { success: false, error: 'Fixture not found' },
        { status: 404 }
      )
    }

    const matchData: MatchData = {
      homeTeam: fixture.homeTeam.name,
      awayTeam: fixture.awayTeam.name,
      league: fixture.league.name,
    }

    const prediction = await generatePrediction(matchData)

    // Send Telegram notification (non-blocking)
    if (prediction) {
      notifyPrediction({
        homeTeam: fixture.homeTeam.name,
        awayTeam: fixture.awayTeam.name,
        league: fixture.league.name,
        homeWinProb: prediction.homeWinProb,
        drawProb: prediction.drawProb,
        awayWinProb: prediction.awayWinProb,
        confidence: prediction.confidence,
        analysis: prediction.analysis,
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      prediction,
      generated: true,
    })
  } catch (error) {
    console.error('[Prediction]', error)
    return NextResponse.json(
      { success: false, error: 'Prediction service unavailable' },
      { status: 502 }
    )
  }
}
