import { NextRequest, NextResponse } from 'next/server'
import {
  generatePrediction,
  type MatchData,
  type AIPrediction,
} from '@/lib/gemini'
import { AI_MODELS, getAISettings } from '@/lib/ai-config'
import { fetchRAGContext, formatRAGForPrompt } from '@/lib/rag-context'
import { PrismaClient } from '@prisma/client'
import { ensureFixtureInDB } from '@/lib/db-service'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Simple in-memory cache
const cache = new Map<string, { prediction: any; timestamp: number }>()

function getCacheKey(match: MatchData): string {
  const base = `${match.homeTeam}-${match.awayTeam}-${match.league}`
  // For live matches, include score and minute in cache key so predictions refresh
  if (match.matchStatus === 'LIVE' || match.matchStatus === 'HALFTIME') {
    return `${base}-live-${match.currentHomeScore ?? 0}-${match.currentAwayScore ?? 0}-${match.minute ?? 0}`
  }
  return base
}

function getFromCache(key: string, maxAgeMinutes: number): any | null {
  const cached = cache.get(key)
  if (!cached) return null

  const ageMs = Date.now() - cached.timestamp
  if (ageMs > maxAgeMinutes * 60 * 1000) {
    cache.delete(key)
    return null
  }

  return cached.prediction
}

function setCache(key: string, prediction: any): void {
  cache.set(key, { prediction, timestamp: Date.now() })

  // Clean old entries if cache is too large
  if (cache.size > 1000) {
    const entries = Array.from(cache.entries())
    entries.slice(0, 500).forEach(([k]) => cache.delete(k))
  }
}

/**
 * Save AI prediction to DB so it can be referenced by user predictions and comparisons.
 */
async function savePredictionToDB(
  body: Record<string, any>,
  match: MatchData,
  prediction: AIPrediction
) {
  // Ensure the fixture (and its teams/league) exist in DB
  const { fixture } = await ensureFixtureInDB({
    apiId: body.fixtureId,
    homeTeam: {
      id: body.homeTeamId || 0,
      name: match.homeTeam,
    },
    awayTeam: {
      id: body.awayTeamId || 0,
      name: match.awayTeam,
    },
    league: {
      id: 0,
      name: match.league,
    },
    matchDate: new Date().toISOString(),
    status: 'SCHEDULED',
  })

  // Upsert the prediction (one per fixture + model version)
  await prisma.prediction.upsert({
    where: {
      id:
        (
          await prisma.prediction.findFirst({
            where: { fixtureId: fixture.id },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
          })
        )?.id ?? 0,
    },
    update: {
      homeWinProb: prediction.homeWinProb * 100,
      drawProb: prediction.drawProb * 100,
      awayWinProb: prediction.awayWinProb * 100,
      predictedHomeScore: prediction.predictedHomeScore,
      predictedAwayScore: prediction.predictedAwayScore,
      confidence: prediction.confidence * 100,
      modelVersion: prediction.model,
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
      modelVersion: prediction.model,
      explanation: prediction.analysis || null,
      keyFactors: prediction.keyFactors || [],
      features: {},
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const settings = getAISettings()

    // Single match prediction
    if (body.match) {
      const match = body.match as MatchData
      const cacheKey = getCacheKey(match)

      // Check cache
      if (settings.cacheEnabled) {
        const cached = getFromCache(cacheKey, settings.cacheDurationMinutes)
        if (cached) {
          return NextResponse.json({ prediction: cached, cached: true })
        }
      }

      // Enrich with RAG context (injuries, news) – best-effort, non-blocking
      if (!match.ragContext && body.homeTeamId && body.awayTeamId) {
        try {
          const ragCtx = await fetchRAGContext(
            body.homeTeamId,
            body.awayTeamId,
            match.homeTeam,
            match.awayTeam,
            match.league,
            body.fixtureId
          )
          const ragText = formatRAGForPrompt(
            ragCtx,
            match.homeTeam,
            match.awayTeam
          )
          if (ragText) {
            match.ragContext = ragText
          }
        } catch {
          // RAG enrichment failed – continue without it
        }
      }

      // Generate prediction
      const prediction = await generatePrediction(match)

      if (prediction && settings.cacheEnabled) {
        setCache(cacheKey, prediction)
      }

      // Persist to DB (best-effort, non-blocking)
      if (prediction && body.fixtureId) {
        savePredictionToDB(body, match, prediction).catch((err) =>
          console.error('[Predict] DB save failed:', err)
        )
      }

      return NextResponse.json({ prediction, cached: false })
    }

    // Batch predictions
    if (body.matches && Array.isArray(body.matches)) {
      const matches = body.matches as MatchData[]
      const results: { match: MatchData; prediction: any; cached: boolean }[] =
        []

      for (const match of matches) {
        const cacheKey = getCacheKey(match)
        let prediction = settings.cacheEnabled
          ? getFromCache(cacheKey, settings.cacheDurationMinutes)
          : null
        const cached = !!prediction

        if (!prediction) {
          prediction = await generatePrediction(match)
          if (prediction && settings.cacheEnabled) {
            setCache(cacheKey, prediction)
          }
        }

        results.push({ match, prediction, cached })
      }

      return NextResponse.json({ predictions: results })
    }

    return NextResponse.json(
      { error: 'Invalid request. Provide "match" or "matches" in body.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Prediction API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate prediction' },
      { status: 500 }
    )
  }
}

// GET endpoint to check available models and current settings
export async function GET() {
  const settings = getAISettings()
  const selectedModel = AI_MODELS.find((m) => m.id === settings.selectedModel)

  // Check which providers are configured
  const providers: Record<string, boolean> = {
    gemini: !!(
      process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    ),
    openai: !!(
      process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY
    ),
    anthropic: !!(
      process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
    ),
  }

  const availableModels = AI_MODELS.filter((model) => providers[model.provider])

  return NextResponse.json({
    settings,
    selectedModel,
    availableModels,
    providers,
    cacheSize: cache.size,
  })
}
