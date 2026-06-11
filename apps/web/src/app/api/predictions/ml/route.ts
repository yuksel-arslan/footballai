import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'
import { generatePrediction, type MatchData } from '@/lib/gemini'
import { notifyPrediction } from '@/lib/telegram'
import { ensureFixtureInDB } from '@/lib/db-service'
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Try gateway first if configured
    if (GATEWAY_URL) {
      try {
        const res = await fetch(`${GATEWAY_URL}/api/predictions/ml`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        })

        if (res.ok) {
          const data = await res.json()
          return NextResponse.json(data, { status: res.status })
        }
      } catch {
        // Gateway unavailable, fall through to direct AI
      }
    }

    // Direct AI fallback
    let { homeTeam, awayTeam, league } = body

    // If team names are not provided but IDs are, look them up from DB (try apiId first)
    if (!homeTeam && body.homeTeamId) {
      const apiId = parseInt(body.homeTeamId)
      const team =
        (await prisma.team.findUnique({
          where: { apiId },
          select: { name: true },
        })) ||
        (await prisma.team.findUnique({
          where: { id: apiId },
          select: { name: true },
        }))
      homeTeam = team?.name
    }
    if (!awayTeam && body.awayTeamId) {
      const apiId = parseInt(body.awayTeamId)
      const team =
        (await prisma.team.findUnique({
          where: { apiId },
          select: { name: true },
        })) ||
        (await prisma.team.findUnique({
          where: { id: apiId },
          select: { name: true },
        }))
      awayTeam = team?.name
    }
    if (!league && body.fixtureId) {
      const apiId = parseInt(body.fixtureId)
      const fixture =
        (await prisma.fixture.findUnique({
          where: { apiId },
          include: { league: { select: { name: true } } },
        })) ||
        (await prisma.fixture.findUnique({
          where: { id: apiId },
          include: { league: { select: { name: true } } },
        }))
      league = fixture?.league?.name
    }

    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        { success: false, error: 'homeTeam and awayTeam are required' },
        { status: 400 }
      )
    }

    const matchData: MatchData = {
      homeTeam,
      awayTeam,
      league: league || 'Unknown League',
      competitionType: body.competitionType,
      round: body.round,
      homeForm: body.homeForm,
      awayForm: body.awayForm,
      homePosition: body.homePosition,
      awayPosition: body.awayPosition,
      h2hResults: body.h2hResults,
    }

    const prediction = await generatePrediction(matchData)

    // Send Telegram notification (non-blocking)
    if (prediction) {
      notifyPrediction({
        homeTeam: matchData.homeTeam,
        awayTeam: matchData.awayTeam,
        league: matchData.league,
        homeWinProb: prediction.homeWinProb,
        drawProb: prediction.drawProb,
        awayWinProb: prediction.awayWinProb,
        confidence: prediction.confidence,
        analysis: prediction.analysis,
      }).catch(() => {})
    }

    // Persist to DB (best-effort, non-blocking)
    if (prediction && body.fixtureId && body.homeTeamId && body.awayTeamId) {
      ;(async () => {
        try {
          const { fixture } = await ensureFixtureInDB({
            apiId: parseInt(body.fixtureId),
            homeTeam: { id: parseInt(body.homeTeamId), name: homeTeam },
            awayTeam: { id: parseInt(body.awayTeamId), name: awayTeam },
            league: { id: 0, name: league || 'Unknown League' },
            matchDate: new Date().toISOString(),
          })
          const existing = await prisma.prediction.findFirst({
            where: { fixtureId: fixture.id },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
          })
          await prisma.prediction.upsert({
            where: { id: existing?.id ?? 0 },
            update: {
              homeWinProb: prediction.homeWinProb * 100,
              drawProb: prediction.drawProb * 100,
              awayWinProb: prediction.awayWinProb * 100,
              predictedHomeScore: prediction.predictedHomeScore,
              predictedAwayScore: prediction.predictedAwayScore,
              confidence: prediction.confidence * 100,
              modelVersion: prediction.model || 'ml',
              explanation: prediction.analysis || null,
              keyFactors: prediction.keyFactors || [],
              features: {},
            },
            create: {
              fixtureId: fixture.id,
              homeWinProb: prediction.homeWinProb * 100,
              drawProb: prediction.drawProb * 100,
              awayWinProb: prediction.awayWinProb * 100,
              predictedHomeScore: prediction.predictedHomeScore,
              predictedAwayScore: prediction.predictedAwayScore,
              confidence: prediction.confidence * 100,
              modelVersion: prediction.model || 'ml',
              explanation: prediction.analysis || null,
              keyFactors: prediction.keyFactors || [],
              features: {},
            },
          })
        } catch (err) {
          console.error('[ML] DB save failed:', err)
        }
      })()
    }

    // Map AI response to PredictionData format expected by frontend
    const predictionData = prediction
      ? {
          id: `ml-${body.fixtureId || Date.now()}`,
          fixtureId: body.fixtureId || 0,
          homeWinProb: Math.round(prediction.homeWinProb * 100),
          drawProb: Math.round(prediction.drawProb * 100),
          awayWinProb: Math.round(prediction.awayWinProb * 100),
          predictedHomeScore: prediction.predictedHomeScore,
          predictedAwayScore: prediction.predictedAwayScore,
          confidence: Math.round(prediction.confidence * 100),
          explanation: prediction.analysis || '',
          keyFactors: prediction.keyFactors || [],
          modelVersion: prediction.model || 'unknown',
          createdAt: new Date().toISOString(),
        }
      : null

    return NextResponse.json({
      success: true,
      data: predictionData,
      source: 'direct-ai',
    })
  } catch (error) {
    console.error('[ML Prediction]', error)
    return NextResponse.json(
      { success: false, error: 'ML service unavailable' },
      { status: 502 }
    )
  }
}
