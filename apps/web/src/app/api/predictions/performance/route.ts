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

type Pick = 'home' | 'draw' | 'away'

function argmax(h: number, d: number, a: number): Pick {
  if (h >= d && h >= a) return 'home'
  if (a >= d && a >= h) return 'away'
  return 'draw'
}
function actual(hs: number, as: number): Pick {
  if (hs > as) return 'home'
  if (hs < as) return 'away'
  return 'draw'
}

/**
 * GET /api/predictions/performance — model track record, computed honestly
 * from stored predictions vs. actual results of finished fixtures. Reports
 * 1X2 hit rate (overall + by confidence band) and recent settled picks.
 * No fabricated ROI — only verifiable accuracy.
 */
export async function GET() {
  try {
    const preds = await prisma.prediction.findMany({
      where: {
        fixture: {
          status: 'FINISHED',
          homeScore: { not: null },
          awayScore: { not: null },
        },
      },
      include: {
        fixture: {
          include: {
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
            league: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    let settled = 0
    let hits = 0
    // confidence bands: <60, 60-75, 75+
    const bands = {
      low: { n: 0, hit: 0 },
      mid: { n: 0, hit: 0 },
      high: { n: 0, hit: 0 },
    }
    const recent: {
      fixtureId: number
      home: string
      away: string
      league: string
      matchDate: string
      pickLabel: string
      prob: number
      score: string
      correct: boolean
    }[] = []

    for (const p of preds) {
      const f = p.fixture
      if (f.homeScore == null || f.awayScore == null) continue
      const pick = argmax(
        p.homeWinProb ?? 0,
        p.drawProb ?? 0,
        p.awayWinProb ?? 0
      )
      const res = actual(f.homeScore, f.awayScore)
      const correct = pick === res
      settled++
      if (correct) hits++

      const conf = p.confidence ?? 0
      const band = conf >= 75 ? bands.high : conf >= 60 ? bands.mid : bands.low
      band.n++
      if (correct) band.hit++

      if (recent.length < 25) {
        const prob = Math.round(
          pick === 'home'
            ? (p.homeWinProb ?? 0)
            : pick === 'away'
              ? (p.awayWinProb ?? 0)
              : (p.drawProb ?? 0)
        )
        recent.push({
          fixtureId: f.apiId || f.id,
          home: f.homeTeam.name,
          away: f.awayTeam.name,
          league: f.league.name,
          matchDate: f.matchDate.toISOString(),
          pickLabel:
            pick === 'home'
              ? f.homeTeam.name
              : pick === 'away'
                ? f.awayTeam.name
                : 'Beraberlik',
          prob,
          score: `${f.homeScore}-${f.awayScore}`,
          correct,
        })
      }
    }

    const pctOf = (b: { n: number; hit: number }) =>
      b.n ? Math.round((b.hit / b.n) * 100) : null

    return NextResponse.json({
      success: true,
      data: {
        settled,
        hits,
        accuracy: settled ? Math.round((hits / settled) * 100) : null,
        bands: {
          low: { n: bands.low.n, accuracy: pctOf(bands.low) },
          mid: { n: bands.mid.n, accuracy: pctOf(bands.mid) },
          high: { n: bands.high.n, accuracy: pctOf(bands.high) },
        },
        recent,
      },
    })
  } catch (error) {
    console.error('[Performance]', error)
    return NextResponse.json(
      { success: false, data: { settled: 0, accuracy: null, recent: [] } },
      { status: 200 }
    )
  }
}
