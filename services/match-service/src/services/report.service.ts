import { prisma } from '@football-ai/database'
import { logger } from '../lib/logger'
import { config } from '../config'
import { aiPredictionService } from './ai-prediction.service'
import { apiFootballClient } from './api-football'
import { cache } from './cache'

/**
 * Post-match reports: every finished fixture gets an automatic analysis that
 * is stored durably and (a) renders the post-match review on the match page,
 * (b) is served per-team as context ("input") for future predictions.
 *
 * The table is self-created at startup (CREATE TABLE IF NOT EXISTS matching
 * the Prisma model), so deploys never depend on a manual migration — repair,
 * don't wait.
 */

// Portable row shape so emitted .d.ts doesn't reference Prisma's runtime
// library (avoids TS2742 under declaration emit).
export interface MatchReportRow {
  id: number
  fixtureId: number
  summary: string
  data: unknown
  createdAt: Date
}

export interface FormEntry {
  result: 'W' | 'D' | 'L'
  opponent: string
  score: string
  date: string
}

export interface ReportData {
  /** Data-shape version; bump to make existing reports regenerate richer. */
  v?: number
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
    probs?: { home: number; draw: number; away: number }
  }
  /** How surprising the result was vs the model's pre-match view. */
  surprise?: 'major' | 'mild' | null
  /** Both teams' last-5 form BEFORE this match (industry pre-match context). */
  preForm?: { home: FormEntry[]; away: FormEntry[] }
  /** Head-to-head record including this match. */
  h2h?: { homeWins: number; draws: number; awayWins: number; total: number }
  /** Value-bet settlement when the engine had a pick on this fixture. */
  valueBet?: {
    pickLabel: string
    selection: 'home' | 'draw' | 'away'
    odds: number
    won: boolean
    profitUnits: number // +odds-1 when won, -1 when lost (1-unit flat stake)
  }
  /** Deep stats mined from our own match history (last 10 per team). */
  stats?: {
    home: TeamStatsBlock
    away: TeamStatsBlock
  }
  /** Match events when the provider exposes them (goals, cards). */
  timeline?: TimelineEvent[]
  discipline?: {
    homeYellow: number
    homeRed: number
    awayYellow: number
    awayRed: number
  }
  takeaways: string[]
}

export interface TeamStatsBlock {
  played: number
  wins: number
  draws: number
  losses: number
  gfAvg: number
  gaAvg: number
  over25Rate: number // % of their matches with 3+ total goals
  bttsRate: number // % with both teams scoring
  cleanSheets: number
  streak: string // e.g. "3W" / "2L" / "1D"
}

export interface TimelineEvent {
  minute: number
  type: 'goal' | 'own_goal' | 'penalty' | 'yellow' | 'red' | 'sub'
  team: 'home' | 'away'
  player: string
  detail?: string
}

const REPORT_VERSION = 2

/** Pre-match prediction block as surfaced in the full report. Probabilities
 * are 0-100 (the stored scale), already rounded for display. */
export interface PreReportPrediction {
  exists: boolean
  homeWinProb?: number
  drawProb?: number
  awayWinProb?: number
  pick?: 'home' | 'draw' | 'away'
  pickLabel?: string
  predictedScore?: string
  confidence?: number
  explanation?: string
  keyFactors?: string[]
  modelVersion?: string
}

/**
 * The PRE-MATCH report ("Önce"): the model prediction + mined form/stats/H2H,
 * plus an in-play read when the match is live/at half-time. Assembled on
 * demand; the prediction row and in-play note are persisted/cached so repeat
 * reads reuse the same computation (shared/published). The post-match report
 * ("Sonra") is a separate, free artifact (MatchReport).
 */
export interface PreReport {
  /** apiId — the public id used for links/sharing. */
  fixtureId: number
  status: string
  home: string
  away: string
  league: string
  matchDate: string
  finished: boolean
  live: boolean
  homeScore: number | null
  awayScore: number | null
  preMatch: {
    prediction: PreReportPrediction
    form: { home: FormEntry[]; away: FormEntry[] }
    stats: { home: TeamStatsBlock; away: TeamStatsBlock }
    h2h: NonNullable<ReportData['h2h']>
  }
  /** In-play ("maç arası") narrative when the match is underway. */
  inPlay?: { summary: string; minute: number; score: string } | null
  generatedAt: string
}

/** One row of the reports list — a card with both phases' availability. */
export interface ReportCard {
  fixtureId: number
  home: string
  away: string
  league: string
  matchDate: string
  status: string
  finished: boolean
  live: boolean
  homeScore: number | null
  awayScore: number | null
  hasPrediction: boolean
  hasPostReport: boolean
  postSummary?: string | null
}

const outcomeOf = (h: number, a: number): 'home' | 'draw' | 'away' =>
  h > a ? 'home' : h < a ? 'away' : 'draw'

class ReportService {
  private tableEnsured = false

  /** Idempotent table creation/upgrade so the feature never waits on a
   * migration. Reports carry a DIRECT leagueId (organization) FK; existing
   * rows are backfilled from their fixture. */
  async ensureTable(): Promise<void> {
    if (this.tableEnsured) return
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "match_reports" (
          "id" SERIAL PRIMARY KEY,
          "fixtureId" INTEGER NOT NULL UNIQUE REFERENCES "fixtures"("id") ON DELETE CASCADE,
          "leagueId" INTEGER REFERENCES "leagues"("id"),
          "summary" TEXT NOT NULL,
          "data" JSONB NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "match_reports" ADD COLUMN IF NOT EXISTS "leagueId" INTEGER REFERENCES "leagues"("id")`
      )
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "match_reports_leagueId_createdAt_idx" ON "match_reports"("leagueId", "createdAt")`
      )
      await prisma.$executeRawUnsafe(`
        UPDATE "match_reports" mr SET "leagueId" = f."leagueId"
        FROM "fixtures" f
        WHERE mr."fixtureId" = f."id" AND mr."leagueId" IS NULL
      `)
      // First-class events table (goals/cards/subs with player + minute).
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "match_events" (
          "id" SERIAL PRIMARY KEY,
          "fixtureId" INTEGER NOT NULL REFERENCES "fixtures"("id") ON DELETE CASCADE,
          "leagueId" INTEGER REFERENCES "leagues"("id"),
          "minute" INTEGER NOT NULL,
          "type" VARCHAR(12) NOT NULL,
          "team" VARCHAR(4) NOT NULL,
          "player" TEXT NOT NULL,
          "detail" TEXT
        )
      `)
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "match_events_fixtureId_idx" ON "match_events"("fixtureId")`
      )
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "match_events_leagueId_type_idx" ON "match_events"("leagueId", "type")`
      )
      this.tableEnsured = true
    } catch (error) {
      logger.error({ error }, 'match_reports ensureTable failed')
    }
  }

  /** A team's last-N finished matches BEFORE a date (pre-match form). */
  private async teamFormBefore(
    name: string,
    before: Date,
    take = 5
  ): Promise<FormEntry[]> {
    const rows = await prisma.fixture.findMany({
      where: {
        status: 'FINISHED',
        homeScore: { not: null },
        awayScore: { not: null },
        matchDate: { lt: before },
        OR: [
          { homeTeam: { name: { equals: name, mode: 'insensitive' } } },
          { awayTeam: { name: { equals: name, mode: 'insensitive' } } },
        ],
      },
      orderBy: { matchDate: 'desc' },
      take,
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    })
    const lc = name.toLowerCase()
    return rows.map((f) => {
      const isHome = f.homeTeam.name.toLowerCase() === lc
      const gf = isHome ? f.homeScore! : f.awayScore!
      const ga = isHome ? f.awayScore! : f.homeScore!
      return {
        result: gf > ga ? 'W' : gf < ga ? 'L' : 'D',
        opponent: isHome ? f.awayTeam.name : f.homeTeam.name,
        score: `${f.homeScore}-${f.awayScore}`,
        date: f.matchDate.toISOString().slice(0, 10),
      } as FormEntry
    })
  }

  /** Deep stats mined from the team's last 10 matches before a date. */
  private async teamStatsBlock(
    name: string,
    before: Date
  ): Promise<TeamStatsBlock> {
    const form = await this.teamFormBefore(name, before, 10)
    let wins = 0
    let draws = 0
    let losses = 0
    let gf = 0
    let ga = 0
    let over25 = 0
    let btts = 0
    let cleanSheets = 0
    for (const e of form) {
      if (e.result === 'W') wins++
      else if (e.result === 'D') draws++
      else losses++
      const [hs, as] = e.score.split('-').map(Number)
      // score is from the fixture's perspective; recover our GF/GA via result
      const ourGoals =
        e.result === 'W'
          ? Math.max(hs, as)
          : e.result === 'L'
            ? Math.min(hs, as)
            : hs
      const theirGoals = hs + as - ourGoals
      gf += ourGoals
      ga += theirGoals
      if (hs + as >= 3) over25++
      if (hs > 0 && as > 0) btts++
      if (theirGoals === 0) cleanSheets++
    }
    const n = form.length || 1
    // current streak: run of identical results from the most recent
    let streak = ''
    if (form.length > 0) {
      const r = form[0].result
      let c = 0
      for (const e of form) {
        if (e.result === r) c++
        else break
      }
      streak = `${c}${r}`
    }
    return {
      played: form.length,
      wins,
      draws,
      losses,
      gfAvg: gf / n,
      gaAvg: ga / n,
      over25Rate: Math.round((over25 / n) * 100),
      bttsRate: Math.round((btts / n) * 100),
      cleanSheets,
      streak,
    }
  }

  /** All-time head-to-head record from our history (including this match). */
  private async h2hRecord(
    home: string,
    away: string
  ): Promise<NonNullable<ReportData['h2h']>> {
    const rows = await prisma.fixture.findMany({
      where: {
        status: 'FINISHED',
        homeScore: { not: null },
        awayScore: { not: null },
        OR: [
          {
            homeTeam: { name: { equals: home, mode: 'insensitive' } },
            awayTeam: { name: { equals: away, mode: 'insensitive' } },
          },
          {
            homeTeam: { name: { equals: away, mode: 'insensitive' } },
            awayTeam: { name: { equals: home, mode: 'insensitive' } },
          },
        ],
      },
      include: { homeTeam: { select: { name: true } } },
    })
    let homeWins = 0
    let draws = 0
    let awayWins = 0
    const homeLc = home.toLowerCase()
    for (const f of rows) {
      if (f.homeScore === f.awayScore) draws++
      else {
        const rowHomeWon = f.homeScore! > f.awayScore!
        const rowHomeIsOurHome = f.homeTeam.name.toLowerCase() === homeLc
        if (rowHomeWon === rowHomeIsOurHome) homeWins++
        else awayWins++
      }
    }
    return { homeWins, draws, awayWins, total: rows.length }
  }

  /**
   * Pull goals/cards from the provider (when the plan allows), persist them
   * as first-class match_events rows, and return a compact timeline for the
   * report. Gracefully absent when events aren't available.
   */
  private async fetchTimeline(
    apiId: number,
    homeName: string
  ): Promise<{
    timeline: TimelineEvent[] | null
    discipline: ReportData['discipline'] | null
  }> {
    // FD-sourced rows (negative apiId): Football-Data's match detail carries
    // goals (scorer+assist+minute) and bookings — current-tournament player
    // data even when the AF plan can't serve it.
    if (apiId < 0) {
      try {
        const { footballDataClient } = await import('./football-data')
        const raw = await footballDataClient.getMatch(-apiId)
        const m = raw?.match ?? raw
        const homeLc = homeName.toLowerCase()
        const timeline: TimelineEvent[] = []
        const discipline = {
          homeYellow: 0,
          homeRed: 0,
          awayYellow: 0,
          awayRed: 0,
        }
        for (const g of m?.goals ?? []) {
          const minute = Number(g?.minute)
          if (!Number.isFinite(minute)) continue
          const side: 'home' | 'away' =
            (g?.team?.name || '').toLowerCase() === homeLc ? 'home' : 'away'
          const t = String(g?.type || '').toUpperCase()
          timeline.push({
            minute,
            type:
              t === 'OWN' ? 'own_goal' : t === 'PENALTY' ? 'penalty' : 'goal',
            team: side,
            player: g?.scorer?.name || '—',
            detail: g?.assist?.name || undefined,
          })
        }
        for (const b of m?.bookings ?? []) {
          const minute = Number(b?.minute)
          if (!Number.isFinite(minute)) continue
          const side: 'home' | 'away' =
            (b?.team?.name || '').toLowerCase() === homeLc ? 'home' : 'away'
          const red = String(b?.card || '')
            .toUpperCase()
            .includes('RED')
          timeline.push({
            minute,
            type: red ? 'red' : 'yellow',
            team: side,
            player: b?.player?.name || '—',
          })
          if (red) side === 'home' ? discipline.homeRed++ : discipline.awayRed++
          else
            side === 'home' ? discipline.homeYellow++ : discipline.awayYellow++
        }
        if (timeline.length === 0) return { timeline: null, discipline: null }
        timeline.sort((a, b) => a.minute - b.minute)
        await this.persistEvents(apiId, timeline)
        return { timeline, discipline }
      } catch {
        return { timeline: null, discipline: null }
      }
    }
    try {
      const data = await apiFootballClient.getFixtureEvents(apiId)
      const rows: any[] = data?.response ?? []
      if (rows.length === 0) return { timeline: null, discipline: null }

      const homeLc = homeName.toLowerCase()
      const timeline: TimelineEvent[] = []
      const discipline = {
        homeYellow: 0,
        homeRed: 0,
        awayYellow: 0,
        awayRed: 0,
      }
      for (const e of rows) {
        const minute = Number(e?.time?.elapsed)
        const player = e?.player?.name || '—'
        const side: 'home' | 'away' =
          (e?.team?.name || '').toLowerCase() === homeLc ? 'home' : 'away'
        const t = String(e?.type || '').toLowerCase()
        const d = String(e?.detail || '').toLowerCase()
        if (!Number.isFinite(minute)) continue
        let type: TimelineEvent['type'] | null = null
        if (t === 'goal') {
          type = d.includes('own')
            ? 'own_goal'
            : d.includes('penalty')
              ? 'penalty'
              : 'goal'
        } else if (t === 'card') {
          type = d.includes('red') ? 'red' : 'yellow'
          if (type === 'red')
            side === 'home' ? discipline.homeRed++ : discipline.awayRed++
          else
            side === 'home' ? discipline.homeYellow++ : discipline.awayYellow++
        } else if (t === 'subst') {
          type = 'sub'
        }
        if (!type) continue
        timeline.push({
          minute,
          type,
          team: side,
          player,
          detail: e?.assist?.name || undefined,
        })
      }
      timeline.sort((a, b) => a.minute - b.minute)
      await this.persistEvents(apiId, timeline)
      return { timeline, discipline }
    } catch {
      return { timeline: null, discipline: null }
    }
  }

  /** Persist a fixture's timeline as first-class match_events rows. */
  private async persistEvents(
    apiId: number,
    timeline: TimelineEvent[]
  ): Promise<void> {
    if (timeline.length === 0) return
    const fx = await prisma.fixture.findUnique({
      where: { apiId },
      select: { id: true, leagueId: true },
    })
    if (!fx) return
    await prisma.matchEvent
      .deleteMany({ where: { fixtureId: fx.id } })
      .catch(() => undefined)
    await prisma.matchEvent
      .createMany({
        data: timeline.map((e) => ({
          fixtureId: fx.id,
          leagueId: fx.leagueId,
          minute: e.minute,
          type: e.type,
          team: e.team,
          player: e.player,
          detail: e.detail ?? null,
        })),
      })
      .catch(() => undefined)
  }

  /** Settle the value-engine's pick on this fixture, if it had one. */
  private async settleValueBet(
    apiId: number,
    outcome: 'home' | 'draw' | 'away',
    names: { home: string; away: string }
  ): Promise<ReportData['valueBet'] | null> {
    try {
      const cached = await cache.get<{
        items?: {
          fixtureId: number
          selection: 'home' | 'draw' | 'away'
          pickLabel: string
          odds: number
          home: string
          away: string
        }[]
      }>('valuebets:upcoming')
      const hit = (cached?.items ?? []).find(
        (i: { fixtureId: number; home: string; away: string }) =>
          i.fixtureId === apiId ||
          (i.home.toLowerCase() === names.home.toLowerCase() &&
            i.away.toLowerCase() === names.away.toLowerCase())
      )
      if (!hit) return null
      const won = hit.selection === outcome
      return {
        pickLabel: hit.pickLabel,
        selection: hit.selection,
        odds: hit.odds,
        won,
        profitUnits: won ? Math.round((hit.odds - 1) * 100) / 100 : -1,
      }
    } catch {
      return null
    }
  }

  /**
   * Generate (or return existing) report for one finished fixture.
   * Accepts internal id or apiId.
   */
  async generateForFixture(
    fixtureIdLike: number
  ): Promise<MatchReportRow | null> {
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
    // Self-upgrade: old (v1) reports regenerate with the richer shape.
    if (existing) {
      const v = (existing.data as { v?: number } | null)?.v
      if (v === REPORT_VERSION) return existing
      await prisma.matchReport
        .delete({ where: { id: existing.id } })
        .catch(() => undefined)
    }

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
        probs: {
          home: Math.round(pred.homeWinProb),
          draw: Math.round(pred.drawProb),
          away: Math.round(pred.awayWinProb),
        },
      }
      predictionNote = `${pickLabel} (%${Math.round(Math.max(pred.homeWinProb, pred.drawProb, pred.awayWinProb))}) — ${pick === outcome ? 'tahmin TUTTU' : 'tahmin tutmadı'}`
    }

    // Surprise level: how little probability the model gave the actual result.
    const surprise: ReportData['surprise'] = predictionAssessment.existed
      ? (predictionAssessment.probOnActual ?? 100) < 20
        ? 'major'
        : (predictionAssessment.probOnActual ?? 100) < 35
          ? 'mild'
          : null
      : null

    // ── Mine our own history: pre-match form, deep stats, H2H ──
    const [homeForm, awayForm, homeStats, awayStats, h2h] = await Promise.all([
      this.teamFormBefore(fx.homeTeam.name, fx.matchDate, 5),
      this.teamFormBefore(fx.awayTeam.name, fx.matchDate, 5),
      this.teamStatsBlock(fx.homeTeam.name, fx.matchDate),
      this.teamStatsBlock(fx.awayTeam.name, fx.matchDate),
      this.h2hRecord(fx.homeTeam.name, fx.awayTeam.name),
    ])

    // ── Match events (goals/cards with players) when the provider has them ──
    const { timeline, discipline } = await this.fetchTimeline(
      fx.apiId,
      fx.homeTeam.name
    )

    // ── Value-bet settlement (engine pick on this fixture, if any) ──
    const valueBet = await this.settleValueBet(fx.apiId, outcome, {
      home: fx.homeTeam.name,
      away: fx.awayTeam.name,
    })

    // AI narrative with the full analytical context; deterministic fallback
    // keeps the pipeline unconditional.
    const fmtForm = (f: FormEntry[]) => f.map((e) => e.result).join('') || '—'
    const ai = await aiPredictionService.summarizeFinishedMatch({
      home: fx.homeTeam.name,
      away: fx.awayTeam.name,
      homeScore: fx.homeScore,
      awayScore: fx.awayScore,
      league: fx.league.name,
      predictionNote,
      context: [
        `Maç öncesi form (son 5): ${fx.homeTeam.name} ${fmtForm(homeForm)}, ${fx.awayTeam.name} ${fmtForm(awayForm)}`,
        `Son 10 maç ortalamaları: ${fx.homeTeam.name} ${homeStats.gfAvg.toFixed(1)} gol attı / ${homeStats.gaAvg.toFixed(1)} yedi; ${fx.awayTeam.name} ${awayStats.gfAvg.toFixed(1)} attı / ${awayStats.gaAvg.toFixed(1)} yedi`,
        h2h.total > 0
          ? `Aralarındaki maçlar: ${fx.homeTeam.name} ${h2h.homeWins} galibiyet, ${h2h.draws} beraberlik, ${fx.awayTeam.name} ${h2h.awayWins} galibiyet`
          : '',
        timeline && timeline.length > 0
          ? `Önemli olaylar: ${timeline
              .filter((e) => e.type !== 'sub')
              .map(
                (e) =>
                  `${e.minute}' ${e.type === 'red' ? 'KIRMIZI KART' : e.type === 'yellow' ? 'sarı kart' : 'gol'} ${e.player}`
              )
              .join('; ')}`
          : '',
        surprise === 'major'
          ? 'Bu sonuç modele göre BÜYÜK SÜRPRİZ.'
          : surprise === 'mild'
            ? 'Bu sonuç modele göre beklenmedik.'
            : '',
      ]
        .filter(Boolean)
        .join('\n'),
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
      v: REPORT_VERSION,
      homeScore: fx.homeScore,
      awayScore: fx.awayScore,
      outcome,
      home: fx.homeTeam.name,
      away: fx.awayTeam.name,
      league: fx.league.name,
      matchDate: fx.matchDate.toISOString(),
      prediction: predictionAssessment,
      surprise,
      preForm: { home: homeForm, away: awayForm },
      h2h,
      ...(valueBet ? { valueBet } : {}),
      stats: { home: homeStats, away: awayStats },
      ...(timeline && timeline.length > 0 ? { timeline } : {}),
      ...(discipline ? { discipline } : {}),
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
      data: {
        fixtureId: fx.id,
        leagueId: fx.leagueId,
        summary,
        data: data as object,
      },
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
    if (generated > 0)
      logger.info({ generated }, 'post-match reports generated')
    return { generated }
  }

  /** Report for one fixture (id or apiId); generates on demand if missing. */
  async getForFixture(fixtureIdLike: number): Promise<MatchReportRow | null> {
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
  async getRecentForTeam(teamName: string, limit = 3): Promise<unknown[]> {
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

  /**
   * Latest reports for the "Maç Sonu" page — restricted to competitions that
   * are currently in season (calendar-driven League.active), so during the
   * World Cup only WC reports are listed. Reports for other competitions
   * still exist (they feed per-team prediction context) but aren't shown.
   * Fails open to all reports only when no league is marked active.
   */
  async getRecent(limit = 20): Promise<unknown[]> {
    await this.ensureTable()
    const activeCount = await prisma.league.count({ where: { active: true } })
    return prisma.matchReport.findMany({
      // Direct organization link — analyses are keyed by leagueId.
      ...(activeCount > 0 ? { where: { league: { active: true } } } : {}),
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
      include: {
        fixture: {
          select: {
            apiId: true,
            matchDate: true,
            homeScore: true,
            awayScore: true,
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
            league: { select: { name: true } },
          },
        },
      },
    })
  }

  /**
   * Assemble the PRE-MATCH report ("Önce") for one fixture (id or apiId): the
   * latest AI prediction + mined last-5 form, last-10 deep stats and all-time
   * H2H, plus the in-play read (from cache) while the match is underway.
   * Returns null only when the fixture itself is unknown.
   */
  async buildPreReport(fixtureIdLike: number): Promise<PreReport | null> {
    const fx = await prisma.fixture.findFirst({
      where: { OR: [{ apiId: fixtureIdLike }, { id: fixtureIdLike }] },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        league: { select: { name: true } },
        predictions: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!fx) return null

    const pred = fx.predictions[0]
    let prediction: PreReportPrediction = { exists: false }
    if (pred) {
      const probs: ['home' | 'draw' | 'away', number][] = [
        ['home', pred.homeWinProb],
        ['draw', pred.drawProb],
        ['away', pred.awayWinProb],
      ]
      const pick = probs.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
      const pickLabel =
        pick === 'home'
          ? fx.homeTeam.name
          : pick === 'away'
            ? fx.awayTeam.name
            : 'Beraberlik'
      prediction = {
        exists: true,
        homeWinProb: Math.round(pred.homeWinProb),
        drawProb: Math.round(pred.drawProb),
        awayWinProb: Math.round(pred.awayWinProb),
        pick,
        pickLabel,
        predictedScore: `${Math.round(pred.predictedHomeScore)}-${Math.round(pred.predictedAwayScore)}`,
        confidence: Math.round(pred.confidence),
        explanation: pred.explanation ?? undefined,
        keyFactors: Array.isArray(pred.keyFactors)
          ? (pred.keyFactors as string[])
          : [],
        modelVersion: pred.modelVersion,
      }
    }

    // Mine our own history as of kickoff (pre-match context). For an upcoming
    // match "before kickoff" naturally yields each side's latest form.
    const before = fx.matchDate
    const [homeForm, awayForm, homeStats, awayStats, h2h] = await Promise.all([
      this.teamFormBefore(fx.homeTeam.name, before, 5),
      this.teamFormBefore(fx.awayTeam.name, before, 5),
      this.teamStatsBlock(fx.homeTeam.name, before),
      this.teamStatsBlock(fx.awayTeam.name, before),
      this.h2hRecord(fx.homeTeam.name, fx.awayTeam.name),
    ])

    const finished =
      fx.status === 'FINISHED' && fx.homeScore != null && fx.awayScore != null
    const live = fx.status === 'LIVE' || fx.status === 'HALFTIME'

    // In-play note (auto-generated by cron; read from cache when present).
    let inPlay: PreReport['inPlay'] = null
    if (live) {
      const cached = await cache
        .get<{
          summary: string
          minute: number
          score: string
        }>(`inplay:${fx.apiId}`)
        .catch(() => null)
      if (cached) inPlay = cached
    }

    return {
      fixtureId: fx.apiId,
      status: fx.status,
      home: fx.homeTeam.name,
      away: fx.awayTeam.name,
      league: fx.league.name,
      matchDate: fx.matchDate.toISOString(),
      finished,
      live,
      homeScore: fx.homeScore,
      awayScore: fx.awayScore,
      preMatch: {
        prediction,
        form: { home: homeForm, away: awayForm },
        stats: { home: homeStats, away: awayStats },
        h2h,
      },
      inPlay,
      generatedAt: new Date().toISOString(),
    }
  }

  /**
   * The reports list ("Raporlar" page): recently finished matches (with their
   * post-match summary) plus upcoming matches in active competitions, each as
   * a card carrying both phases' availability. Restricted to active orgs when
   * any are in season; fails open otherwise.
   */
  async listReportCards(limit = 30): Promise<ReportCard[]> {
    await this.ensureTable()
    const activeCount = await prisma.league.count({ where: { active: true } })
    const orgFilter = activeCount > 0 ? { league: { active: true } } : {}
    const horizon = new Date(Date.now() + 1000 * 60 * 60 * 24 * 5) // 5 days

    const [finished, upcoming] = await Promise.all([
      prisma.fixture.findMany({
        where: {
          status: 'FINISHED',
          homeScore: { not: null },
          ...orgFilter,
        },
        orderBy: { matchDate: 'desc' },
        take: Math.min(Math.max(limit, 1), 50),
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
          league: { select: { name: true } },
          report: { select: { summary: true } },
          _count: { select: { predictions: true } },
        },
      }),
      prisma.fixture.findMany({
        where: {
          status: { in: ['SCHEDULED', 'LIVE', 'HALFTIME'] },
          matchDate: {
            gte: new Date(Date.now() - 1000 * 60 * 60 * 3),
            lte: horizon,
          },
          ...orgFilter,
        },
        orderBy: { matchDate: 'asc' },
        take: Math.min(Math.max(limit, 1), 50),
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
          league: { select: { name: true } },
          _count: { select: { predictions: true } },
        },
      }),
    ])

    const toCard = (
      f: (typeof finished)[number] | (typeof upcoming)[number]
    ): ReportCard => {
      const isFinished =
        f.status === 'FINISHED' && f.homeScore != null && f.awayScore != null
      const live = f.status === 'LIVE' || f.status === 'HALFTIME'
      const report = (f as { report?: { summary: string } | null }).report
      return {
        fixtureId: f.apiId,
        home: f.homeTeam.name,
        away: f.awayTeam.name,
        league: f.league.name,
        matchDate: f.matchDate.toISOString(),
        status: f.status,
        finished: isFinished,
        live,
        homeScore: f.homeScore,
        awayScore: f.awayScore,
        hasPrediction: (f._count?.predictions ?? 0) > 0,
        hasPostReport: !!report,
        postSummary: report?.summary ?? null,
      }
    }

    // Upcoming first (kickoff-ascending), then finished (most recent first).
    const cards = [...upcoming.map(toCard), ...finished.map(toCard)]
    return cards.slice(0, Math.min(Math.max(limit, 1), 60))
  }

  /**
   * Automation: ensure upcoming matches in active competitions have a model
   * prediction so the "Önce" report is ready before kickoff. Skips when no AI
   * key is configured. Capped per run to respect provider quota.
   */
  async generateUpcomingPredictions(
    limit = 10
  ): Promise<{ generated: number }> {
    if (!config.ai.geminiApiKey) return { generated: 0 }
    const horizon = new Date(Date.now() + 1000 * 60 * 60 * 48) // 48h
    const fixtures = await prisma.fixture.findMany({
      where: {
        status: 'SCHEDULED',
        matchDate: { gte: new Date(), lte: horizon },
        league: { active: true },
        predictions: { none: {} },
      },
      select: { id: true },
      orderBy: { matchDate: 'asc' },
      take: limit,
    })
    let generated = 0
    for (const f of fixtures) {
      try {
        await aiPredictionService.generatePrediction(f.id)
        generated++
      } catch (error) {
        logger.error({ error, fixtureId: f.id }, 'auto prediction failed')
      }
    }
    if (generated > 0)
      logger.info({ generated }, 'pre-match predictions auto-generated')
    return { generated }
  }

  /**
   * Automation: generate the in-play ("maç arası") read for live / half-time
   * matches and cache it for the pre-match report. Regenerates as the match
   * evolves (short TTL). Skips when no AI key is configured.
   */
  async generateInPlayAnalyses(limit = 8): Promise<{ generated: number }> {
    if (!config.ai.geminiApiKey) return { generated: 0 }
    const fixtures = await prisma.fixture.findMany({
      where: { status: { in: ['LIVE', 'HALFTIME'] } },
      orderBy: { matchDate: 'asc' },
      take: limit,
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        league: { select: { name: true } },
      },
    })
    let generated = 0
    for (const fx of fixtures) {
      const key = `inplay:${fx.apiId}`
      const homeScore = fx.homeScore ?? 0
      const awayScore = fx.awayScore ?? 0
      const halftime = fx.status === 'HALFTIME'
      const minute = fx.minute ?? (halftime ? 45 : 0)
      // Skip if a note for this exact score already exists (avoid re-spend).
      const existing = await cache.get<{ score: string }>(key).catch(() => null)
      if (existing && existing.score === `${homeScore}-${awayScore}`) continue
      try {
        const ai = await aiPredictionService.summarizeInPlay({
          home: fx.homeTeam.name,
          away: fx.awayTeam.name,
          homeScore,
          awayScore,
          minute,
          halftime,
          league: fx.league.name,
        })
        if (ai) {
          await cache.set(
            key,
            { summary: ai.summary, minute, score: `${homeScore}-${awayScore}` },
            20 * 60
          )
          generated++
        }
      } catch (error) {
        logger.error({ error, fixtureId: fx.id }, 'in-play analysis failed')
      }
    }
    if (generated > 0) logger.info({ generated }, 'in-play analyses generated')
    return { generated }
  }
}

export const reportService = new ReportService()
