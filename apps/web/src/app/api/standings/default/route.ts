import { NextResponse } from 'next/server'
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

// Standings-capable competitions: API-Football league id -> standings code.
const API_ID_TO_CODE: Record<number, string> = {
  1: 'WC',
  2: 'CL',
  3: 'EL',
  39: 'PL',
  61: 'FL1',
  78: 'BL1',
  88: 'DED',
  94: 'PPL',
  135: 'SA',
  140: 'PD',
  203: 'TSL',
}

/**
 * GET /api/standings/default — which competition's standings to show first.
 * Picks the standings-capable competition with the most upcoming fixtures
 * (the tournament/league actually running now), so during the World Cup the
 * default is WC rather than a fixed league. Returns { code } or null.
 */
export async function GET() {
  try {
    const now = new Date()
    const horizon = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
    const ids = Object.keys(API_ID_TO_CODE).map(Number)

    const upcoming = await prisma.fixture.findMany({
      where: {
        status: 'SCHEDULED',
        matchDate: { gte: now, lte: horizon },
        league: { apiId: { in: ids } },
      },
      select: { league: { select: { apiId: true } } },
      take: 300,
    })

    const counts = new Map<number, number>()
    for (const f of upcoming) {
      const a = f.league.apiId
      if (a != null) counts.set(a, (counts.get(a) ?? 0) + 1)
    }
    // Require ≥3 fixtures so a lone stale row can't claim the default.
    let bestApiId = -1
    let bestCount = 2
    for (const [a, c] of counts) {
      if (c > bestCount) {
        bestCount = c
        bestApiId = a
      }
    }

    const code = API_ID_TO_CODE[bestApiId] ?? null
    return NextResponse.json({ success: true, data: { code } })
  } catch (error) {
    console.error('[Standings Default]', error)
    return NextResponse.json({ success: true, data: { code: null } })
  }
}
