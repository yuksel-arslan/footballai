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
    // Modern forecast evaluation (2017 Soccer Prediction Challenge standard):
    // RPS respects the ordinal nature of 1X2; log-loss (ignorance) is the
    // strictly proper alternative favored by recent literature.
    let rpsSum = 0
    let logLossSum = 0
    // confidence bands: <60, 60-75, 75+
    const bands = {
      low: { n: 0, hit: 0 },
      mid: { n: 0, hit: 0 },
      high: { n: 0, hit: 0 },
    }
    // Calibration: bucket the pick's stated probability vs realized hit rate.
    const calib = [
      { label: '<%40', lo: 0, hi: 40, n: 0, hit: 0 },
      { label: '%40-55', lo: 40, hi: 55, n: 0, hit: 0 },
      { label: '%55-70', lo: 55, hi: 70, n: 0, hit: 0 },
      { label: '%70+', lo: 70, hi: 101, n: 0, hit: 0 },
    ]
    const recent: {
      fixtureId: number
      home: string
      away: string
      league: string
      matchDate: string
      pickLabel: string
      predictedScore: string
      prob: number
      score: string
      correct: boolean
    }[] = []
    // Normalised 1X2 distribution + realized outcome per settled match, for
    // the data-driven temperature-calibration search below.
    const dist: { p: [number, number, number]; res: 0 | 1 | 2 }[] = []

    for (const p of preds) {
      const f = p.fixture
      if (f.homeScore == null || f.awayScore == null) continue
      // The model's call is its predicted SCORELINE (consistent with the
      // report cards): a 1-1 prediction is a draw call and counts as a draw
      // even if the 1X2 probability argmax leaned elsewhere. Fall back to the
      // probability argmax only when no scoreline was stored.
      const hasScore =
        p.predictedHomeScore != null && p.predictedAwayScore != null
      const pick = hasScore
        ? actual(
            Math.round(p.predictedHomeScore as number),
            Math.round(p.predictedAwayScore as number)
          )
        : argmax(p.homeWinProb ?? 0, p.drawProb ?? 0, p.awayWinProb ?? 0)
      const res = actual(f.homeScore, f.awayScore)
      const correct = pick === res
      settled++
      if (correct) hits++

      // Normalize stored 0-100 probabilities to a proper distribution.
      const rawH = Math.max(p.homeWinProb ?? 0, 0)
      const rawD = Math.max(p.drawProb ?? 0, 0)
      const rawA = Math.max(p.awayWinProb ?? 0, 0)
      const tot = rawH + rawD + rawA || 1
      const ph = rawH / tot
      const pd = rawD / tot
      const pa = rawA / tot
      // RPS over the ordered outcomes (home, draw, away).
      const o = [
        res === 'home' ? 1 : 0,
        res === 'draw' ? 1 : 0,
        res === 'away' ? 1 : 0,
      ]
      const c1 = ph - o[0]
      const c2 = ph + pd - (o[0] + o[1])
      rpsSum += (c1 * c1 + c2 * c2) / 2
      // Log-loss on the realized outcome (clamped to avoid -inf).
      const pActual = res === 'home' ? ph : res === 'draw' ? pd : pa
      logLossSum += -Math.log(Math.min(Math.max(pActual, 1e-6), 1))
      dist.push({
        p: [ph, pd, pa],
        res: res === 'home' ? 0 : res === 'draw' ? 1 : 2,
      })

      const conf = p.confidence ?? 0
      const band = conf >= 75 ? bands.high : conf >= 60 ? bands.mid : bands.low
      band.n++
      if (correct) band.hit++

      // Calibration bucket by the pick's stated probability.
      const pickProb = (pick === 'home' ? ph : pick === 'draw' ? pd : pa) * 100
      const bucket = calib.find((b) => pickProb >= b.lo && pickProb < b.hi)
      if (bucket) {
        bucket.n++
        if (correct) bucket.hit++
      }

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
          predictedScore: hasScore
            ? `${Math.round(p.predictedHomeScore as number)}-${Math.round(p.predictedAwayScore as number)}`
            : '—',
          prob,
          score: `${f.homeScore}-${f.awayScore}`,
          correct,
        })
      }
    }

    const pctOf = (b: { n: number; hit: number }) =>
      b.n ? Math.round((b.hit / b.n) * 100) : null

    // Value-bet track record from settled post-match reports: each v2 report
    // carries the pre-match value pick's settlement (won, profitUnits at the
    // recorded odds, 1 unit stakes). Real money math, not a simulation.
    let vbSettled = 0
    let vbWins = 0
    let vbProfit = 0
    const weekMap = new Map<string, number>()
    try {
      const reports = await prisma.matchReport.findMany({
        orderBy: { createdAt: 'asc' },
        take: 1000,
        select: { createdAt: true, data: true },
      })
      for (const r of reports) {
        const vb = (
          r.data as {
            valueBet?: { won?: boolean; profitUnits?: number }
          } | null
        )?.valueBet
        if (!vb || typeof vb.profitUnits !== 'number') continue
        vbSettled++
        if (vb.won) vbWins++
        vbProfit += vb.profitUnits
        // ISO-week bucket (Monday-based) for the cumulative chart.
        const d = new Date(r.createdAt)
        const monday = new Date(d)
        monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
        const wk = monday.toISOString().slice(0, 10)
        weekMap.set(wk, (weekMap.get(wk) ?? 0) + vb.profitUnits)
      }
    } catch {
      // reports table empty/unreachable — value-bet block stays null
    }
    let cum = 0
    const weekly = [...weekMap.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-10)
      .map(([week, profit]) => {
        cum += profit
        return {
          week,
          profit: Math.round(profit * 100) / 100,
          cumulative: Math.round(cum * 100) / 100,
        }
      })

    // Data-driven calibration: the temperature T that, applied to the stored
    // 1X2 distributions, minimises log-loss over the settled history. T>1 means
    // the model is over-confident (soften it); T<1 under-confident. Only
    // meaningful with a real sample, so gate on settled count.
    let suggestedTemperature: number | null = null
    if (dist.length >= 30) {
      const logLossAt = (t: number): number => {
        let s = 0
        for (const d of dist) {
          const q = d.p.map((x) => Math.pow(Math.max(x, 1e-9), 1 / t))
          const z = q[0] + q[1] + q[2] || 1
          s += -Math.log(Math.min(Math.max(q[d.res] / z, 1e-6), 1))
        }
        return s / dist.length
      }
      let bestT = 1
      let bestLL = Infinity
      for (let t = 0.6; t <= 2.0001; t += 0.05) {
        const ll = logLossAt(t)
        if (ll < bestLL) {
          bestLL = ll
          bestT = t
        }
      }
      suggestedTemperature = Math.round(bestT * 100) / 100
    }

    return NextResponse.json({
      success: true,
      data: {
        settled,
        hits,
        suggestedTemperature,
        accuracy: settled ? Math.round((hits / settled) * 100) : null,
        // 0 = perfect; ~0.2089 is the constant (1/3,1/3,1/3) baseline.
        rps: settled ? Math.round((rpsSum / settled) * 1000) / 1000 : null,
        // Lower is better; ln(3)≈1.099 is the uniform baseline.
        logLoss: settled
          ? Math.round((logLossSum / settled) * 1000) / 1000
          : null,
        valueBets: {
          settled: vbSettled,
          wins: vbWins,
          profitUnits: Math.round(vbProfit * 100) / 100,
          // ROI on 1-unit stakes — real settlements, no simulation.
          roi: vbSettled
            ? Math.round((vbProfit / vbSettled) * 1000) / 1000
            : null,
          weekly,
        },
        calibration: calib.map((b) => ({
          label: b.label,
          n: b.n,
          accuracy: b.n ? Math.round((b.hit / b.n) * 100) : null,
        })),
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
