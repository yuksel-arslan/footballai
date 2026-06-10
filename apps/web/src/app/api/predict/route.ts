import { NextRequest, NextResponse } from 'next/server'
import {
  generatePrediction,
  consumeLastPredictionError,
  type MatchData,
  type AIPrediction,
} from '@/lib/gemini'
import {
  AI_MODELS,
  AUTO_MODEL_ID,
  configuredModels,
  findModel,
  getAISettings,
  isProviderConfigured,
  resolveModelForTask,
} from '@/lib/ai-config'
import { fetchRAGContext, formatRAGForPrompt } from '@/lib/rag-context'
import { PrismaClient } from '@prisma/client'
import { ensureFixtureInDB } from '@/lib/db-service'
import { verifyToken } from '@/lib/auth-service'
import { debitCredits, refundCredits } from '@/lib/credits'

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

function extractUserId(request: NextRequest): string | null {
  const cookieToken = request.cookies.get('auth-token')?.value
  const headerAuth = request.headers.get('authorization') || ''
  const token =
    cookieToken ||
    (headerAuth.startsWith('Bearer ') ? headerAuth.slice(7) : null)
  if (!token) return null
  const decoded = verifyToken(token)
  return decoded?.userId ?? null
}

export async function POST(request: NextRequest) {
  try {
    // Auth required for all prediction generation (credits are debited).
    const userId = extractUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'authentication_required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const settings = getAISettings()

    // Single match prediction
    if (body.match) {
      const match = body.match as MatchData
      const cacheKey = getCacheKey(match)

      // Resolve model + cost. Body.modelId wins over admin-default setting so
      // the user picks the tier per request. 'auto' lets the server pick the
      // best configured model for the prediction task.
      const requestedModelId =
        typeof body.modelId === 'string' ? body.modelId : settings.selectedModel
      const model =
        requestedModelId === AUTO_MODEL_ID
          ? resolveModelForTask('prediction')
          : findModel(requestedModelId)
      if (!model) {
        return NextResponse.json(
          requestedModelId === AUTO_MODEL_ID
            ? { error: 'ai_not_configured', modelId: requestedModelId }
            : { error: 'invalid_model', modelId: requestedModelId },
          { status: requestedModelId === AUTO_MODEL_ID ? 503 : 400 }
        )
      }

      // Cache check happens BEFORE debiting — re-reads of the same prediction
      // do not cost credits.
      if (settings.cacheEnabled) {
        const cached = getFromCache(cacheKey, settings.cacheDurationMinutes)
        if (cached) {
          return NextResponse.json({
            prediction: cached,
            cached: true,
            model: { id: model.id, creditCost: model.creditCost },
          })
        }
      }

      // Atomically debit before calling Gemini. If balance is short, return
      // 402 so the client can redirect to /pricing.
      const debit = await debitCredits({
        userId,
        amount: model.creditCost,
        type: 'AI_PREDICTION',
        refId: body.fixtureId ? String(body.fixtureId) : null,
        metadata: { modelId: model.id, fixtureId: body.fixtureId ?? null },
      })

      if (!debit.ok) {
        return NextResponse.json(
          {
            error: 'insufficient_credits',
            balance: debit.balance,
            required: debit.required,
            modelId: model.id,
          },
          { status: 402 }
        )
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

      // Generate prediction with the selected model
      const prediction = await generatePrediction(match, model)

      // Refund if the provider failed — user shouldn't pay for upstream errors.
      if (!prediction) {
        const upstreamError = consumeLastPredictionError()
        const refund = await refundCredits({
          userId,
          amount: model.creditCost,
          refId: body.fixtureId ? String(body.fixtureId) : null,
          metadata: {
            reason: 'provider_failure',
            modelId: model.id,
            originalDebitId: debit.transactionId,
            upstreamError,
          },
        })
        return NextResponse.json(
          {
            error: 'prediction_failed',
            balance: refund.balance,
            modelId: model.id,
            // Surface the actual upstream cause so the user (and we) know
            // whether to retry, switch model, or report a bug.
            details: upstreamError,
          },
          { status: 502 }
        )
      }

      if (settings.cacheEnabled) {
        setCache(cacheKey, prediction)
      }

      // Persist to DB (best-effort, non-blocking)
      if (body.fixtureId) {
        savePredictionToDB(body, match, prediction).catch((err) =>
          console.error('[Predict] DB save failed:', err)
        )
      }

      return NextResponse.json({
        prediction,
        cached: false,
        balance: debit.balance,
        model: { id: model.id, creditCost: model.creditCost },
      })
    }

    return NextResponse.json(
      { error: 'Invalid request. Provide "match" in body.' },
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

// GET endpoint to check available models, providers and task routing
export async function GET() {
  const settings = getAISettings()
  const selectedModel =
    settings.selectedModel === AUTO_MODEL_ID
      ? resolveModelForTask('prediction')
      : AI_MODELS.find((m) => m.id === settings.selectedModel)
  const geminiConfigured = isProviderConfigured('gemini')

  return NextResponse.json({
    settings,
    selectedModel,
    availableModels: configuredModels(),
    geminiConfigured,
    providers: {
      gemini: geminiConfigured,
      anthropic: isProviderConfigured('anthropic'),
    },
    // Which model each task auto-resolves to with the current env
    taskRouting: {
      research: resolveModelForTask('research')?.id ?? null,
      analysis: resolveModelForTask('analysis')?.id ?? null,
      prediction: resolveModelForTask('prediction')?.id ?? null,
    },
    cacheSize: cache.size,
  })
}
