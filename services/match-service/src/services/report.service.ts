import { prisma } from '@football-ai/database'
import { logger } from '../lib/logger'
import { aiPredictionService } from './ai-prediction.service'

/**
 * Post-match reports: every finished fixture gets an automatic analysis that
 * is stored durably and (a) renders the post-match review on the match page,
 * (b) is served per-team as context ("input") for future predictions.
 *
 * The table is self-created at startup (CREATE TABLE IF NOT EXISTS matching
 * the Prisma model), so deploys never depend on a manual migration — repair,
 * don't wait.
 */

export interface ReportData {
  homeScore: number
  awayScore: number
  outcome: 'home' | 'draw' | 'away'
  home: string
  away: string
  league: string
  matchDate: string
  prediction: {
    existed: boolean
    pick?: 'home' | 'draw' | 'away'
    pickLabel?: string
    correct?: boolean
    probOnActual?: number // probability the model gave the ACTUAL outcome
    predictedScore?: string
    confidence?: number
  }
  takeaways: string[]
}

const outcomeOf = (h: number, a: number): 'home' | 'draw' | 'away' =>
  h > a ? 'home' : h < a ? 'away' : 'draw'

class ReportService {
  private tableEnsured = false

  /** Idempotent table creation so the feature never waits on a migration. */
  async ensureTable(): Promise<void> {
    if (this.tableEnsured) return
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "match_reports" (
          "id" SERIAL PRIMARY KEY,
          "fixtureId" INTEGER NOT NULL UNIQUE REFERENCES "fixtures"("id") ON DELETE CASCADE,
          "summary" TEXT NOT NULL,
          "data" JSONB NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)
      this.tableEnsured = true
    } catch (error) {
      logger.error({ error }, 'match_reports ensureTable failed')
    }
  }

  /**
   * Generate (or return existing) report for one finished fixture.
   * Accepts internal id or apiId.
   */
  async generateForFixture(fixtureIdLike: number) {
    await this.ensureTable()
    const fx = await prisma.fixture.findFirst({
      where: { OR: [{ apiId: fixtureIdLike }, { id: fixtureIdLike }] },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        league: { select: { name: true } },
        predictions: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!fx || fx.status !== 'FINISHED') return null
    if (fx.homeScore == null || fx.awayScore == null) return null

    const existing = await prisma.matchReport.findUnique({
      where: { fixtureId: fx.id },
    })
    if (existing) return existing

    const outcome = outcomeOf(fx.homeScore, fx.awayScore)
    const pred = fx.predictions[0]

    // Assess the stored pre-match prediction against the actual result.
    let predictionAssessment: ReportData['prediction'] = { existed: false }
    let predictionNote: string | undefined
    if (pred) {
      const probs: ['home' | 'draw' | 'away', number][] = [
        ['home', pred.homeWinProb],
        ['draw', pred.drawProb],
        ['away', pred.awayWinProb],
      ]
      const pick = probs.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
      const probOnActual = probs.find(([k]) => k === outcome)?.[1] ?? 0
      const pickLabel =
        pick === 'home'
          ? fx.homeTeam.name
          : pick === 'away'
            ? fx.awayTeam.name
            : 'Beraberlik'
      predictionAssessment = {
        existed: true,
        pick,
        pickLabel,
        correct: pick === outcome,
        probOnActual: Math.round(probOnActual),
        predictedScore: `${Math.round(pred.predictedHomeScore)}-${Math.round(pred.predictedAwayScore)}`,
        confidence: Math.round(pred.confidence),
      }
      predictionNote = `${pickLabel} (%${Math.round(Math.max(pred.homeWinProb, pred.drawProb, pred.awayWinProb))}) — ${pick === outcome ? 'tahmin TUTTU' : 'tahmin tutmadı'}`
    }

    // AI narrative; deterministic fallback keeps the pipeline unconditional.
    const ai = await aiPredictionService.summarizeFinishedMatch({
      home: fx.homeTeam.name,
      away: fx.awayTeam.name,
      homeScore: fx.homeScore,
      awayScore: fx.awayScore,
      league: fx.league.name,
      predictionNote,
    })
    const winnerName =
      outcome === 'home'
        ? fx.homeTeam.name
        : outcome === 'away'
          ? fx.awayTeam.name
          : null
    const summary =
      ai?.summary ??
      (winnerName
        ? `${fx.homeTeam.name} ${fx.homeScore}-${fx.awayScore} ${fx.awayTeam.name}: ${winnerName} sahadan galip ayrıldı.` +
          (predictionAssessment.existed
            ? predictionAssessment.correct
              ? ` Model bu sonucu doğru tahmin etmişti (${predictionAssessment.pickLabel}).`
              : ` Model ${predictionAssessment.pickLabel} beklemişti; sonuç farklı geldi.`
            : '')
        : `${fx.homeTeam.name} ${fx.homeScore}-${fx.awayScore} ${fx.awayTeam.name}: taraflar puanları paylaştı.`)

    const data: ReportData = {
      homeScore: fx.homeScore,
      awayScore: fx.awayScore,
      outcome,
      home: fx.homeTeam.name,
      away: fx.awayTeam.name,
      league: fx.league.name,
      matchDate: fx.matchDate.toISOString(),
      prediction: predictionAssessment,
      takeaways: ai?.takeaways ?? [],
    }

    // Also settle the stored prediction row (result tracking for /performance).
    if (pred && !pred.actualResult) {
      await prisma.prediction
        .update({
          where: { id: pred.id },
          data: {
            actualResult: outcome,
            predictedResult: predictionAssessment.pick,
          },
        })
        .catch(() => undefined)
    }

    return prisma.matchReport.create({
      data: { fixtureId: fx.id, summary, data: data as object },
    })
  }

  /**
   * Sweep recently finished fixtures lacking a report. Called from cron so
   * every finished match ALWAYS gets its analysis without anyone clicking.
   */
  async generatePending(limit = 15): Promise<{ generated: number }> {
    await this.ensureTable()
    const since = new Date(Date.now() - 72 * 60 * 60 * 1000)
    const fixtures = await prisma.fixture.findMany({
      where: {
        status: 'FINISHED',
        homeScore: { not: null },
        matchDate: { gte: since },
        report: null,
      },
      select: { id: true },
      orderBy: { matchDate: 'desc' },
      take: limit,
    })
    let generated = 0
    for (const f of fixtures) {
      try {
        const r = await this.generateForFixture(f.id)
        if (r) generated++
      } catch (error) {
        logger.error({ error, fixtureId: f.id }, 'report generation failed')
      }
    }
    if (generated > 0) logger.info({ generated }, 'post-match reports generated')
    return { generated }
  }

  /** Report for one fixture (id or apiId); generates on demand if missing. */
  async getForFixture(fixtureIdLike: number) {
    await this.ensureTable()
    const fx = await prisma.fixture.findFirst({
      where: { OR: [{ apiId: fixtureIdLike }, { id: fixtureIdLike }] },
      select: { id: true, status: true },
    })
    if (!fx) return null
    const existing = await prisma.matchReport.findUnique({
      where: { fixtureId: fx.id },
    })
    if (existing) return existing
    if (fx.status !== 'FINISHED') return null
    return this.generateForFixture(fx.id)
  }

  /**
   * Recent reports involving a team (by name) — the "input for the next
   * matches": prediction prompts include these summaries as context.
   */
  async getRecentForTeam(teamName: string, limit = 3) {
    await this.ensureTable()
    const reports = await prisma.matchReport.findMany({
      where: {
        fixture: {
          OR: [
            { homeTeam: { name: { equals: teamName, mode: 'insensitive' } } },
            { awayTeam: { name: { equals: teamName, mode: 'insensitive' } } },
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 10),
      include: {
        fixture: {
          select: {
            apiId: true,
            matchDate: true,
            homeScore: true,
            awayScore: true,
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
          },
        },
      },
    })
    return reports
  }
}

export const reportService = new ReportService()
