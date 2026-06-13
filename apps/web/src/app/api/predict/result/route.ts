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
 * GET /api/predict/result?fixtureId=
 *
 * Read-only, credit-free access to the stored AI prediction for a fixture —
 * powers the automatic "AI tahmini" card in the free product. The prediction
 * itself is produced automatically (pre-match cron); this endpoint only
 * reveals what already exists. Returns null when none has been generated yet.
 * Probabilities/confidence are on the stored 0–100 scale.
 */
export async function GET(request: NextRequest) {
  const n = Number(request.nextUrl.searchParams.get('fixtureId'))
  if (!Number.isFinite(n)) {
    return NextResponse.json(
      { success: false, error: 'fixtureId required' },
      { status: 400 }
    )
  }
  try {
    const fx = await prisma.fixture.findFirst({
      where: { OR: [{ apiId: n }, { id: n }] },
      select: { id: true, apiId: true },
    })
    const p = fx
      ? await prisma.prediction.findFirst({
          where: { fixtureId: fx.id },
          orderBy: { createdAt: 'desc' },
        })
      : null
    if (!p) {
      return NextResponse.json({ success: true, data: null })
    }
    return NextResponse.json({
      success: true,
      data: {
        id: String(p.id),
        fixtureId: fx?.apiId ?? n,
        homeWinProb: Math.round(p.homeWinProb ?? 0),
        drawProb: Math.round(p.drawProb ?? 0),
        awayWinProb: Math.round(p.awayWinProb ?? 0),
        predictedHomeScore: p.predictedHomeScore ?? 0,
        predictedAwayScore: p.predictedAwayScore ?? 0,
        confidence: Math.round(p.confidence ?? 0),
        explanation: p.explanation ?? '',
        keyFactors: (p.keyFactors as string[]) ?? [],
        modelVersion: p.modelVersion ?? 'stored',
        createdAt: p.createdAt?.toISOString() ?? new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('[Predict result]', error)
    return NextResponse.json({ success: true, data: null })
  }
}
