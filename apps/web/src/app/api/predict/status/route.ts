import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth-service'

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
 * GET /api/predict/status?fixtureId= — does a stored AI prediction exist for
 * this fixture, when was it generated, and has THIS viewer already paid for
 * it (re-viewing is free)? Drives the prediction card's empty-state so a
 * generated prediction is never presented as if it didn't happen.
 */
export async function GET(request: NextRequest) {
  const fixtureIdLike = Number(request.nextUrl.searchParams.get('fixtureId'))
  if (!Number.isFinite(fixtureIdLike)) {
    return NextResponse.json(
      { success: false, error: 'fixtureId required' },
      { status: 400 }
    )
  }
  try {
    const fx = await prisma.fixture.findFirst({
      where: { OR: [{ apiId: fixtureIdLike }, { id: fixtureIdLike }] },
      select: { id: true },
    })
    const pred = fx
      ? await prisma.prediction.findFirst({
          where: { fixtureId: fx.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        })
      : null

    let paid = false
    const token = request.cookies.get('auth-token')?.value
    const userId = token ? (verifyToken(token)?.userId ?? null) : null
    if (userId && pred) {
      const tx = await prisma.creditTransaction.findFirst({
        where: {
          userId,
          type: 'AI_PREDICTION',
          refId: String(fixtureIdLike),
          delta: { lt: 0 },
        },
        select: { id: true },
      })
      paid = !!tx
    }

    return NextResponse.json({
      success: true,
      data: {
        stored: !!pred,
        createdAt: pred?.createdAt?.toISOString() ?? null,
        paid,
      },
    })
  } catch (error) {
    console.error('[Predict status]', error)
    return NextResponse.json({
      success: true,
      data: { stored: false, createdAt: null, paid: false },
    })
  }
}
