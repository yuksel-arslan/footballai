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
    const horizon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    const allUpcoming = await prisma.fixture.findMany({
      where: { status: 'SCHEDULED', matchDate: { gte: now, lte: horizon } },
      include: {
        homeTeam: { select: { id: true, name: true, logoUrl: true } },
        awayTeam: { select: { id: true, name: true, logoUrl: true } },
        league: { select: { id: true, name: true } },
        predictions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { matchDate: 'asc' },
      take: 120,
    })

    // "Spirit of the day": the dominant competition is the one with the most
    // upcoming fixtures, but only if it has at least 3 in the window — a lone
    // stale fixture (e.g. an off-season Bundesliga row) can never win. If no
    // league qualifies, use the soonest fixture's league.
    const MIN_DOMINANT = 3
    const byLeague = new Map<number, number>()
    for (const f of allUpcoming)
      byLeague.set(f.leagueId, (byLeague.get(f.leagueId) ?? 0) + 1)
    let dominantLeague = allUpcoming[0]?.leagueId ?? -1
    let dominantCount = 0
    for (const [lid, c] of byLeague) {
      if (c >= MIN_DOMINANT && c > dominantCount) {
        dominantCount = c
        dominantLeague = lid
      }
    }
    const upcoming = allUpcoming.filter((f) => f.leagueId === dominantLeague)

    // Prefer fixtures that already HAVE a stored prediction (free to show):
    // first those in the dominant competition, else any predicted fixture —
    // "model produced N predictions today" should surface one of them.
    const predicted = allUpcoming.filter((f) => f.predictions.length > 0)
    const inTheme = predicted.filter((f) => f.leagueId === dominantLeague)
    const withPred = inTheme.length > 0 ? inTheme : predicted

    let featured: Featured | null = null

    if (withPred.length > 0) {
      // Soonest predicted match (theme-preferred)
      const best = withPred[0]
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

    const predictedCount = allUpcoming.filter(
      (f) => f.predictions.length > 0
    ).length

    return NextResponse.json({
      success: true,
      data: { featured, predictedCount },
    })
  } catch (error) {
    console.error('[Featured]', error)
    return NextResponse.json(
      { success: false, data: { featured: null, predictedCount: 0 } },
      { status: 200 }
    )
  }
}
