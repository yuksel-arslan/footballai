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

type Featured = {
  fixtureId: number
  home: string
  away: string
  homeLogo?: string | null
  awayLogo?: string | null
  league: string
  matchDate: string
  pick: 'home' | 'draw' | 'away'
  pickLabel: string
  prob: number // 0-100
  confidence: number | null // 0-100
  source: 'model' | 'form'
}

/** Recent win rate (last 10 finished) for a team — cheap form proxy. */
async function winRate(teamId: number): Promise<number | null> {
  const fx = await prisma.fixture.findMany({
    where: {
      status: 'FINISHED',
      homeScore: { not: null },
      awayScore: { not: null },
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    select: { homeTeamId: true, homeScore: true, awayScore: true },
    orderBy: { matchDate: 'desc' },
    take: 10,
  })
  if (!fx.length) return null
  let w = 0
  for (const m of fx) {
    const isHome = m.homeTeamId === teamId
    const gf = (isHome ? m.homeScore : m.awayScore) as number
    const ga = (isHome ? m.awayScore : m.homeScore) as number
    if (gf > ga) w++
  }
  return Math.round((w / fx.length) * 100)
}

/**
 * GET /api/predictions/featured — free home-page teaser.
 * Returns the best stored prediction for an upcoming fixture (pick + prob,
 * no paid detail), plus how many upcoming fixtures already have a prediction.
 * If none are stored yet, falls back to a free form-based lean for the
 * soonest upcoming match. No credits, no AI calls.
 */
export async function GET() {
  try {
    const now = new Date()
    const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const upcoming = await prisma.fixture.findMany({
      where: { status: 'SCHEDULED', matchDate: { gte: now, lte: horizon } },
      include: {
        homeTeam: { select: { id: true, name: true, logoUrl: true } },
        awayTeam: { select: { id: true, name: true, logoUrl: true } },
        league: { select: { name: true } },
        predictions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { matchDate: 'asc' },
      take: 60,
    })

    const withPred = upcoming.filter((f) => f.predictions.length > 0)

    let featured: Featured | null = null

    if (withPred.length > 0) {
      // Highest-confidence stored prediction
      const best = withPred.reduce((a, b) =>
        (b.predictions[0].confidence ?? 0) > (a.predictions[0].confidence ?? 0)
          ? b
          : a
      )
      const p = best.predictions[0]
      const probs: [Featured['pick'], number, string][] = [
        ['home', p.homeWinProb ?? 0, best.homeTeam.name],
        ['draw', p.drawProb ?? 0, 'Beraberlik'],
        ['away', p.awayWinProb ?? 0, best.awayTeam.name],
      ]
      const top = probs.reduce((a, b) => (b[1] > a[1] ? b : a))
      featured = {
        fixtureId: best.apiId || best.id,
        home: best.homeTeam.name,
        away: best.awayTeam.name,
        homeLogo: best.homeTeam.logoUrl,
        awayLogo: best.awayTeam.logoUrl,
        league: best.league.name,
        matchDate: best.matchDate.toISOString(),
        pick: top[0],
        pickLabel: top[2],
        prob: Math.round(top[1]),
        confidence: p.confidence != null ? Math.round(p.confidence) : null,
        source: 'model',
      }
    } else {
      // Free form-based lean for the soonest upcoming match with history
      for (const f of upcoming) {
        const [hw, aw] = await Promise.all([
          winRate(f.homeTeam.id),
          winRate(f.awayTeam.id),
        ])
        if (hw == null || aw == null) continue
        const pick: Featured['pick'] =
          Math.abs(hw - aw) < 12 ? 'draw' : hw > aw ? 'home' : 'away'
        featured = {
          fixtureId: f.apiId || f.id,
          home: f.homeTeam.name,
          away: f.awayTeam.name,
          homeLogo: f.homeTeam.logoUrl,
          awayLogo: f.awayTeam.logoUrl,
          league: f.league.name,
          matchDate: f.matchDate.toISOString(),
          pick,
          pickLabel:
            pick === 'home'
              ? f.homeTeam.name
              : pick === 'away'
                ? f.awayTeam.name
                : 'Beraberlik',
          prob: Math.max(hw, aw),
          confidence: null,
          source: 'form',
        }
        break
      }
    }

    return NextResponse.json({
      success: true,
      data: { featured, predictedCount: withPred.length },
    })
  } catch (error) {
    console.error('[Featured]', error)
    return NextResponse.json(
      { success: false, data: { featured: null, predictedCount: 0 } },
      { status: 200 }
    )
  }
}
