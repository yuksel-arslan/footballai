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
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    process.env.APP_DATABASE_URL
      ? { datasourceUrl: process.env.APP_DATABASE_URL }
      : undefined
  )
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Recent post-match report summaries for both teams (from match-service) as
 * prompt context — each new prediction learns from previous matches' results.
 */
async function fetchTeamReportContext(
  homeTeam: string,
  awayTeam: string
): Promise<string | null> {
  const gateway =
    process.env.API_GATEWAY_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3000'
  const fetchTeam = async (team: string): Promise<string[]> => {
    const r = await fetch(
      `${gateway}/api/predictions/reports?team=${encodeURIComponent(team)}&limit=3`,
      { signal: AbortSignal.timeout(4000) }
    )
    if (!r.ok) return []
    const json = (await r.json().catch(() => null)) as {
      data?: { summary?: string; fixture?: { homeTeam?: { name?: string }; awayTeam?: { name?: string }; homeScore?: number; awayScore?: number } }[]
    } | null
    return (json?.data ?? [])
      .map((rep) => {
        const f = rep.fixture
        const line = f
          ? `${f.homeTeam?.name} ${f.homeScore}-${f.awayScore} ${f.awayTeam?.name}: `
          : ''
        return rep.summary ? `- ${line}${rep.summary}` : null
      })
      .filter((s): s is string => !!s)
  }
  const [homeReports, awayReports] = await Promise.all([
    fetchTeam(homeTeam).catch(() => []),
    fetchTeam(awayTeam).catch(() => []),
  ])
  if (homeReports.length === 0 && awayReports.length === 0) return null
  const parts: string[] = ['--- SON MAÇ DEĞERLENDİRMELERİ (geçmiş analizlerden) ---']
  if (homeReports.length) parts.push(`${homeTeam}:`, ...homeReports)
  if (awayReports.length) parts.push(`${awayTeam}:`, ...awayReports)
  return parts.join('\n')
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

/**
 * Load a previously computed prediction for this fixture (compute-once
 * sharing). Returns it in the 0-1 probability shape the API/route uses, or
 * null when none is stored. fixtureId may be an apiId or internal id.
 */
async function loadStoredPrediction(
  fixtureIdLike: unknown
): Promise<AIPrediction | null> {
  const n = Number(fixtureIdLike)
  if (!Number.isFinite(n)) return null
  const fx = await prisma.fixture.findFirst({
    where: { OR: [{ apiId: n }, { id: n }] },
    select: { id: true },
  })
  if (!fx) return null
  const p = await prisma.prediction.findFirst({
    where: { fixtureId: fx.id },
    orderBy: { createdAt: 'desc' },
  })
  if (!p) return null
  return {
    homeWinProb: (p.homeWinProb ?? 0) / 100,
    drawProb: (p.drawProb ?? 0) / 100,
    awayWinProb: (p.awayWinProb ?? 0) / 100,
    predictedHomeScore: p.predictedHomeScore ?? 0,
    predictedAwayScore: p.predictedAwayScore ?? 0,
    confidence: (p.confidence ?? 0) / 100,
    analysis: p.explanation ?? '',
    keyFactors: (p.keyFactors as string[]) ?? [],
    model: p.modelVersion ?? 'stored',
  }
}

/** Has this user already paid for this fixture's AI prediction? */
async function hasPaidForFixture(
  userId: string,
  fixtureId: unknown
): Promise<boolean> {
  if (fixtureId == null) return false
  const row = await prisma.creditTransaction.findFirst({
    where: {
      userId,
      type: 'AI_PREDICTION',
      refId: String(fixtureId),
      delta: { lt: 0 },
    },
    select: { id: true },
  })
  return !!row
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

      // Billing model: one computation per fixture, shared by everyone, but
      // each user pays once to see it. A user who already paid for this
      // fixture re-views for free; everyone else pays before the result is
      // revealed — even if it was already computed by someone else.
      const stored = body.fixtureId
        ? await loadStoredPrediction(body.fixtureId)
        : null
      if (stored && (await hasPaidForFixture(userId, body.fixtureId))) {
        return NextResponse.json({
          prediction: stored,
          cached: true,
          model: { id: model.id, creditCost: model.creditCost },
        })
      }

      // Atomically debit before revealing/generating. If balance is short,
      // return 402 so the client can redirect to /pricing.
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

      // Already computed by someone else → reuse it (the user just paid to
      // view). No AI call, no recompute.
      if (stored) {
        return NextResponse.json({
          prediction: stored,
          cached: true,
          balance: debit.balance,
          model: { id: model.id, creditCost: model.creditCost },
        })
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

      // Post-match report context: recent finished-match analyses for both
      // teams feed the prompt, so each prediction learns from the previous
      // matches' outcomes. Best-effort.
      try {
        const reportCtx = await fetchTeamReportContext(
          match.homeTeam,
          match.awayTeam
        )
        if (reportCtx) {
          match.ragContext = match.ragContext
            ? `${match.ragContext}\n\n${reportCtx}`
            : reportCtx
        }
      } catch {
        // report context unavailable – continue without it
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

      // Persist before returning so the next viewer reuses this computation
      // (shared result) instead of paying for a fresh AI call.
      if (body.fixtureId) {
        try {
          await savePredictionToDB(body, match, prediction)
        } catch (err) {
          console.error('[Predict] DB save failed:', err)
        }
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
  })
}
