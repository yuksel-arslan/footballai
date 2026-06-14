import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@football-ai/database'
import { aiPredictionService } from '../services/ai-prediction.service'
import {
  debitCredits,
  refundCredits,
  ML_PREDICTION_COST,
  DIXON_COLES_COST,
  PRE_REPORT_COST,
  PRE_REPORT_PAST_COST,
  FREE_MODE,
} from '../services/credit.service'
import { apiFootballClient } from '../services/api-football'
import { cache } from '../services/cache'
import {
  CURATED_LEAGUE_IDS,
  INTERNATIONAL_LEAGUE_API_IDS,
  fixtureService,
} from '../services/fixture-service'
import { config } from '../config'
import { logger } from '../lib/logger'
import { reportService } from '../services/report.service'
import { analyticsService } from '../services/analytics.service'

// Shape returned by the ml-service value engine for a single selection.
interface MlValueBet {
  selection: 'home' | 'draw' | 'away'
  odds: number
  model_prob: number
  market_prob_vigfree: number
  edge: number
  ev_per_unit: number
  full_kelly: number
  rec_kelly: number
  is_value: boolean
}

// Full probability block returned by the ml-service Dixon-Coles engine (the
// 1X2 + goal-market distribution the value cards render).
interface DixonMlProbabilities {
  home_win: number
  draw: number
  away_win: number
  over_2_5: number
  under_2_5: number
  btts_yes: number
  btts_no: number
  expected_home_goals: number
  expected_away_goals: number
  top_scorelines: { home: number; away: number; prob: number }[]
}

interface DixonMlResult {
  value?: MlValueBet[]
  probabilities?: DixonMlProbabilities
}

// One cached value bet, self-contained so the list endpoint needs no joins.
interface ValueBetItem {
  fixtureId: number
  league: { id: number; name: string }
  home: string
  away: string
  matchDate: string
  selection: 'home' | 'draw' | 'away'
  pickLabel: string
  odds: number
  modelProb: number
  marketProb: number
  edge: number
  evPerUnit: number
  recKelly: number
  probs: { home: number; draw: number; away: number }
}

const VALUE_BETS_KEY = 'valuebets:upcoming'
const VALUE_BETS_LOCK = 'valuebets:refresh:lock'

// National-team names differ across providers (Football-Data vs API-Football).
// Normalize for matching, plus an explicit alias map for cases normalization
// can't bridge. Keys/values are compared after normalize().
const TEAM_NAME_ALIASES: Record<string, string> = {
  'south korea': 'korea republic',
  'north korea': 'korea dpr',
  'ivory coast': 'cote divoire',
  czechia: 'czech republic',
  usa: 'united states',
  'united states of america': 'united states',
  iran: 'ir iran',
  china: 'china pr',
  'cape verde': 'cabo verde',
  turkiye: 'turkey',
  'bosnia and herzegovina': 'bosnia',
  'dr congo': 'congo dr',
}

const normalizeTeam = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Resolve a (possibly foreign-provider) team name to the canonical name that
 * actually exists in the history pool. Tries exact, normalized, then alias.
 */
const resolveToPoolName = (
  name: string,
  poolByNorm: Map<string, string>
): string | null => {
  const norm = normalizeTeam(name)
  if (poolByNorm.has(norm)) return poolByNorm.get(norm)!
  const aliased = TEAM_NAME_ALIASES[norm]
  if (aliased && poolByNorm.has(aliased)) return poolByNorm.get(aliased)!
  // reverse: pool name may be the alias key and the incoming the value
  for (const [k, v] of Object.entries(TEAM_NAME_ALIASES)) {
    if (v === norm && poolByNorm.has(k)) return poolByNorm.get(k)!
  }
  return null
}

// Map fixture's home/away score into the same string vocabulary the user
// recorded their prediction with (predictedResult column: 'home' | 'draw' | 'away').
const deriveActualResult = (
  homeScore: number | null,
  awayScore: number | null
): string | null => {
  if (homeScore == null || awayScore == null) return null
  if (homeScore > awayScore) return 'home'
  if (homeScore < awayScore) return 'away'
  return 'draw'
}

class PredictionController {
  /**
   * Diagnostic: why is international value-analysis failing?
   * GET /api/predictions/diag  — no secrets returned.
   */
  async getDiag(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const keyPresent = !!config.apiFootball.key
      const [intlPool, finishedTotal] = await Promise.all([
        prisma.fixture.count({
          where: {
            status: 'FINISHED',
            homeScore: { not: null },
            league: { apiId: { in: INTERNATIONAL_LEAGUE_API_IDS } },
          },
        }),
        prisma.fixture.count({
          where: { status: 'FINISHED', homeScore: { not: null } },
        }),
      ])

      // Optional name-resolution check: /diag?home=Türkiye&away=South%20Korea
      let nameCheck: Record<string, unknown> | undefined
      const homeQ = typeof req.query.home === 'string' ? req.query.home : null
      const awayQ = typeof req.query.away === 'string' ? req.query.away : null
      if (homeQ || awayQ) {
        const pool = await prisma.fixture.findMany({
          where: {
            status: 'FINISHED',
            homeScore: { not: null },
            league: { apiId: { in: INTERNATIONAL_LEAGUE_API_IDS } },
          },
          include: {
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
          },
          orderBy: { matchDate: 'desc' },
          take: 1000,
        })
        const poolByNorm = new Map<string, string>()
        for (const f of pool) {
          for (const n of [f.homeTeam.name, f.awayTeam.name]) {
            const k = normalizeTeam(n)
            if (!poolByNorm.has(k)) poolByNorm.set(k, n)
          }
        }
        nameCheck = {
          home: homeQ
            ? { input: homeQ, resolved: resolveToPoolName(homeQ, poolByNorm) }
            : null,
          away: awayQ
            ? { input: awayQ, resolved: resolveToPoolName(awayQ, poolByNorm) }
            : null,
          poolTeams: [...poolByNorm.values()].sort(),
        }
      }

      // Live probe: how many WC-2022 fixtures does API-Football return right now?
      let probe: { ok: boolean; count?: number; error?: string }
      try {
        const r = await apiFootballClient.getFixtures({
          league: 1,
          season: 2022,
        })
        probe = { ok: true, count: (r.response || []).length }
      } catch (e) {
        probe = { ok: false, error: e instanceof Error ? e.message : String(e) }
      }

      const [running, done, cooldown] = await Promise.all([
        cache.get('intl-backfill:v4:running'),
        cache.get('intl-backfill:v4:done'),
        cache.get('intl-backfill:v4:cooldown'),
      ])

      // Dry-run the exact history pipeline the analysis uses:
      // /diag?fixtureId=12345[&home=X&away=Y]
      let historyCheck: Record<string, unknown> | undefined
      const fxQ =
        typeof req.query.fixtureId === 'string' ? req.query.fixtureId : null
      if (fxQ) {
        const built = await this.buildDixonColesHistory({
          fixtureId: Number(fxQ),
          ...(homeQ ? { home: homeQ } : {}),
          ...(awayQ ? { away: awayQ } : {}),
        })
        historyCheck = built.ok
          ? {
              ok: true,
              resolvedHome: built.home,
              resolvedAway: built.away,
              historySize: built.history.length,
              ratingsKey: built.ratingsKey,
            }
          : { ok: false, status: built.status, error: built.error }
      }

      // Manual trigger: /diag?ensureWc=1 — scan the WC roster and load any
      // team missing from the pool (team-level last-15 fetch).
      let wcSweep: Record<string, unknown> | undefined
      if (req.query.ensureWc === '1') {
        wcSweep = await fixtureService.ensureWorldCupTeamHistory()
      }

      // Manual trigger: /diag?syncCalendar=1 — pull each curated
      // competition's season window and auto-set active/passive.
      let calendar: Record<string, unknown> | undefined
      if (req.query.syncCalendar === '1') {
        calendar = await fixtureService.syncSeasonCalendar()
      }

      // Manual trigger: /diag?syncNow=1 — ingest today+tomorrow synchronously
      // and report counts (self-heal for empty lists).
      let syncNow: Record<string, unknown> | undefined
      if (req.query.syncNow === '1') {
        const today = new Date().toISOString().slice(0, 10)
        const tomorrow = new Date(Date.now() + 86400000)
          .toISOString()
          .slice(0, 10)
        const r1 = await fixtureService
          .syncFixtures({ date: today })
          .catch((e) => ({ error: e instanceof Error ? e.message : String(e) }))
        const r2 = await fixtureService
          .syncFixtures({ date: tomorrow })
          .catch((e) => ({ error: e instanceof Error ? e.message : String(e) }))
        await cache.clear('*fixtures:*').catch(() => undefined)
        syncNow = { today: r1, tomorrow: r2 }
      }

      // Manual trigger: /diag?syncActive=1 — sync the FULL season of every
      // active organization (league+season query; plan-restriction-proof).
      let syncActive: Record<string, unknown> | undefined
      if (req.query.syncActive === '1') {
        syncActive = await fixtureService.syncActiveSeasons()
      }

      // END-TO-END SELF-TEST: /diag?selftest=1 — walks the full user-facing
      // chain (lists → detail identity → finished → report → org filter) and
      // returns a single PASS/FAIL verdict. Nothing ships as "done" without
      // this passing.
      let selftest: Record<string, unknown> | undefined
      if (req.query.selftest === '1') {
        const checks: Record<string, string> = {}
        const fail = (k: string, msg: string) => (checks[k] = `FAIL: ${msg}`)
        const ok = (k: string, msg = 'ok') => (checks[k] = msg)
        try {
          const act = await prisma.league.count({ where: { active: true } })
          act > 0
            ? ok('activeOrganizations', `${act} active`)
            : fail('activeOrganizations', 'no active league (calendar sync?)')

          const up = (await fixtureService.getUpcomingFixtures({
            limit: 5,
          })) as any[]
          up.length > 0
            ? ok('upcomingList', `${up.length} rows`)
            : fail('upcomingList', 'empty (ingest?)')

          if (up.length > 0) {
            const first = up[0]
            const byApi = await fixtureService.getFixtureById(first.apiId)
            byApi
              ? ok('detailByApiId', `apiId ${first.apiId} resolves`)
              : fail('detailByApiId', `apiId ${first.apiId} NOT resolvable`)
          }

          const fin = (await fixtureService.getFinishedFixtures({
            limit: 3,
          })) as any[]
          ok('finishedList', `${fin.length} rows`)

          if (fin.length > 0) {
            // The exact failure class users hit: a FINISHED match must be
            // openable via the same apiId its list/report links carry.
            const finDetail = await fixtureService.getFixtureById(fin[0].apiId)
            finDetail
              ? ok('finishedDetailByApiId', `apiId ${fin[0].apiId} resolves`)
              : fail(
                  'finishedDetailByApiId',
                  `apiId ${fin[0].apiId} NOT resolvable`
                )

            const rep = await reportService.getForFixture(fin[0].apiId)
            rep
              ? ok('postMatchReport', `fixture ${fin[0].apiId} has report`)
              : fail('postMatchReport', `no report for ${fin[0].apiId}`)
          }

          await fixtureService.getLiveFixtures()
          ok('liveListQuery')

          // Measured analytics must compute for the active organization.
          const actLeague = await prisma.league.findFirst({
            where: { active: true },
            select: { apiId: true },
          })
          if (actLeague?.apiId != null) {
            const strengths = await analyticsService.teamStrengths(
              actLeague.apiId
            )
            strengths.length > 0
              ? ok('teamAnalytics', `${strengths.length} teams rated`)
              : fail('teamAnalytics', 'no strength rows (archive too thin?)')
          }

          // Status-transition integrity: a SCHEDULED row whose kickoff passed
          // hours ago, or a LIVE row far past full time, means the
          // SCHEDULED→LIVE→FINISHED pipeline is wedged for some source — the
          // exact bug class that empties the Canlı/Biten tabs.
          const [stuckScheduled, stuckLive] = await Promise.all([
            prisma.fixture.count({
              where: {
                status: 'SCHEDULED',
                matchDate: { lt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
                league: { active: true },
              },
            }),
            prisma.fixture.count({
              where: {
                status: { in: ['LIVE', 'HALFTIME'] },
                matchDate: { lt: new Date(Date.now() - 5 * 60 * 60 * 1000) },
              },
            }),
          ])
          stuckScheduled === 0 && stuckLive === 0
            ? ok('statusIntegrity', 'no wedged fixtures')
            : fail(
                'statusIntegrity',
                `${stuckScheduled} stuck SCHEDULED, ${stuckLive} stuck LIVE`
              )
        } catch (e) {
          fail('exception', e instanceof Error ? e.message : String(e))
        }
        const pass = !Object.values(checks).some((v) => v.startsWith('FAIL'))
        selftest = { pass, checks }
      }

      // What does the by-date endpoint actually return for this key? AF
      // replies 200 with an `errors` object on plan violations — surface it.
      let byDateProbe: Record<string, unknown> | undefined
      if (req.query.probeDate === '1') {
        try {
          const raw = await apiFootballClient.getFixtures({
            date: new Date().toISOString().slice(0, 10),
          })
          byDateProbe = {
            count: (raw?.response ?? []).length,
            errors: raw?.errors ?? null,
          }
        } catch (e) {
          byDateProbe = { error: e instanceof Error ? e.message : String(e) }
        }
      }

      // List-pipeline visibility: how many rows each tab can draw from, and
      // which organizations are currently active.
      const now = new Date()
      const [
        scheduledTotal,
        scheduledFuture,
        scheduledFutureActive,
        liveNow,
        activeLeagues,
      ] = await Promise.all([
        prisma.fixture.count({ where: { status: 'SCHEDULED' } }),
        prisma.fixture.count({
          where: { status: 'SCHEDULED', matchDate: { gte: now } },
        }),
        prisma.fixture.count({
          where: {
            status: 'SCHEDULED',
            matchDate: { gte: now },
            league: { active: true },
          },
        }),
        prisma.fixture.count({
          where: { status: { in: ['LIVE', 'HALFTIME'] } },
        }),
        prisma.league.findMany({
          where: { active: true },
          select: { apiId: true, name: true },
          orderBy: { apiId: 'asc' },
        }),
      ])

      res.json({
        apiFootballKeyPresent: keyPresent,
        internationalFinishedInDb: intlPool,
        finishedFixturesTotal: finishedTotal,
        lists: {
          scheduledTotal,
          scheduledFuture,
          scheduledFutureActive,
          liveNow,
          activeLeagues,
        },
        apiFootballProbe_WC2022: probe,
        backfill: { running: !!running, done: !!done, cooldown: !!cooldown },
        ...(nameCheck ? { nameCheck } : {}),
        ...(historyCheck ? { historyCheck } : {}),
        ...(wcSweep ? { wcSweep } : {}),
        ...(calendar ? { calendar } : {}),
        ...(syncNow ? { syncNow } : {}),
        ...(selftest ? { selftest } : {}),
        ...(syncActive ? { syncActive } : {}),
        ...(byDateProbe ? { byDateProbe } : {}),
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get AI prediction for a fixture (Gemini-based)
   * GET /api/predictions/:fixtureId
   */
  async getPrediction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const fixtureId = parseInt(req.params.fixtureId as string)
      if (isNaN(fixtureId)) {
        res.status(400).json({ success: false, error: 'Invalid fixtureId' })
        return
      }

      const prediction = await aiPredictionService.generatePrediction(fixtureId)
      res.json({ success: true, data: prediction })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get ML model prediction (Poisson + XGBoost via ml-service)
   * POST /api/predictions/ml
   *
   * Frontend sends a thin payload (fixtureId + team IDs). The ml-service
   * however needs full team-stat objects + h2h counts. We resolve those from
   * the DB here so the frontend doesn't have to assemble them itself.
   */
  async getMLPrediction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Free mode disables manual on-demand analysis (unbounded provider cost);
      // the automatic, shared reports stay available.
      if (FREE_MODE) {
        res.status(403).json({ success: false, error: 'manual_disabled' })
        return
      }
      const userId = (req as any).user?.id as string | undefined
      if (!userId) {
        res
          .status(401)
          .json({ success: false, error: 'Authentication required' })
        return
      }

      const body = req.body as {
        fixtureId?: number
        homeTeamId?: number
        awayTeamId?: number
        competitionType?: string
        round?: string
      }
      const fixtureIdRaw = body.fixtureId
      const homeTeamIdRaw = body.homeTeamId
      const awayTeamIdRaw = body.awayTeamId

      if (!fixtureIdRaw || !homeTeamIdRaw || !awayTeamIdRaw) {
        res.status(400).json({
          success: false,
          error: 'fixtureId, homeTeamId and awayTeamId are required',
        })
        return
      }

      // IDs from the frontend may be either Football-API ids (apiId) or our
      // internal Prisma ids — try both.
      const findTeam = async (idLike: number) => {
        return (
          (await prisma.team.findUnique({ where: { apiId: idLike } })) ||
          (await prisma.team.findUnique({ where: { id: idLike } }))
        )
      }
      const findFixture = async (idLike: number) => {
        return (
          (await prisma.fixture.findUnique({ where: { apiId: idLike } })) ||
          (await prisma.fixture.findUnique({ where: { id: idLike } }))
        )
      }

      const [homeTeam, awayTeam, fixture] = await Promise.all([
        findTeam(homeTeamIdRaw),
        findTeam(awayTeamIdRaw),
        findFixture(fixtureIdRaw),
      ])

      if (!homeTeam || !awayTeam) {
        res.status(404).json({
          success: false,
          error: 'Team not found in database — sync fixtures first',
        })
        return
      }

      // Pull most recent stats row per team (highest season).
      const [homeStats, awayStats] = await Promise.all([
        prisma.teamStats.findFirst({
          where: { teamId: homeTeam.id },
          orderBy: [{ season: 'desc' }],
        }),
        prisma.teamStats.findFirst({
          where: { teamId: awayTeam.id },
          orderBy: [{ season: 'desc' }],
        }),
      ])

      // H2H: stored as a single row per unordered pair, but we don't know
      // which team was indexed as team1. Try both directions and orient.
      const h2hRow =
        (await prisma.h2HRecord.findFirst({
          where: { team1Id: homeTeam.id, team2Id: awayTeam.id },
        })) ||
        (await prisma.h2HRecord.findFirst({
          where: { team1Id: awayTeam.id, team2Id: homeTeam.id },
        }))

      const h2hHomeWins = h2hRow
        ? h2hRow.team1Id === homeTeam.id
          ? h2hRow.team1Wins
          : h2hRow.team2Wins
        : 0
      const h2hAwayWins = h2hRow
        ? h2hRow.team1Id === awayTeam.id
          ? h2hRow.team1Wins
          : h2hRow.team2Wins
        : 0
      const h2hDraws = h2hRow ? h2hRow.draws : 0

      // Map a Prisma TeamStats row (or nothing) into the shape ml-service
      // expects. ml-service: snake_case + flat. We compute `points` since
      // it isn't stored.
      const mapStats = (
        team: { id: number; name: string },
        stats: typeof homeStats
      ) => ({
        team_id: team.id,
        name: team.name,
        matches_played: stats?.matchesPlayed ?? 0,
        wins: stats?.wins ?? 0,
        draws: stats?.draws ?? 0,
        losses: stats?.losses ?? 0,
        goals_for: stats?.goalsFor ?? 0,
        goals_against: stats?.goalsAgainst ?? 0,
        home_wins: stats?.homeWins ?? 0,
        away_wins: stats?.awayWins ?? 0,
        clean_sheets: stats?.cleanSheets ?? 0,
        points: (stats?.wins ?? 0) * 3 + (stats?.draws ?? 0),
        last_five_form: stats?.lastFiveForm ?? null,
        league_position: null, // sourced from Standing model — not joined here for speed
      })

      const mlPayload = {
        fixture_id: fixture?.id ?? fixtureIdRaw,
        home_team: mapStats(homeTeam, homeStats),
        away_team: mapStats(awayTeam, awayStats),
        h2h_home_wins: h2hHomeWins,
        h2h_away_wins: h2hAwayWins,
        h2h_draws: h2hDraws,
        is_home_favorite: false,
        competition_type: body.competitionType || 'domestic_league',
        round: body.round || null,
      }

      // Debit credits before calling ml-service. Refund on any failure.
      const debit = await debitCredits({
        userId,
        amount: ML_PREDICTION_COST,
        type: 'ML_PREDICTION',
        refId: String(fixture?.id ?? fixtureIdRaw),
        metadata: {
          fixtureId: fixture?.id ?? fixtureIdRaw,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
        },
      })

      if (!debit.ok) {
        res.status(402).json({
          success: false,
          error: 'insufficient_credits',
          balance: debit.balance,
          required: debit.required,
        })
        return
      }

      const mlUrl = config.mlServiceUrl || 'http://localhost:8000'
      const refIdStr = String(fixture?.id ?? fixtureIdRaw)
      let mlRes: globalThis.Response
      try {
        mlRes = await fetch(mlUrl + '/api/predictions/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mlPayload),
          signal: AbortSignal.timeout(15000),
        })
      } catch (fetchErr) {
        const refund = await refundCredits({
          userId,
          amount: ML_PREDICTION_COST,
          refId: refIdStr,
          metadata: {
            reason: 'ml_service_unreachable',
            originalDebitId: debit.transactionId,
          },
        })
        res.status(502).json({
          success: false,
          error: 'ml_service_unreachable',
          balance: refund.balance,
          detail:
            fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
        })
        return
      }

      if (!mlRes.ok) {
        const err = (await mlRes.json().catch(() => ({}))) as {
          detail?: unknown
        }
        const refund = await refundCredits({
          userId,
          amount: ML_PREDICTION_COST,
          refId: refIdStr,
          metadata: {
            reason: 'ml_service_error',
            status: mlRes.status,
            originalDebitId: debit.transactionId,
          },
        })
        res.status(mlRes.status).json({
          success: false,
          error: err.detail || 'ML prediction failed',
          balance: refund.balance,
        })
        return
      }

      const data = await mlRes.json()
      res.json({
        success: true,
        data,
        source: 'ml-service',
        balance: debit.balance,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Compare a user's prediction for a fixture against the actual result.
   * GET /api/predictions/compare?fixtureId=N
   * Auth required — uses req.user.id.
   */
  async getComparison(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user?.id as string | undefined
      if (!userId) {
        res
          .status(401)
          .json({ success: false, error: 'Authentication required' })
        return
      }
      const fixtureIdRaw = req.query.fixtureId
      const fixtureId =
        typeof fixtureIdRaw === 'string' ? parseInt(fixtureIdRaw, 10) : NaN
      if (!Number.isFinite(fixtureId)) {
        res
          .status(400)
          .json({ success: false, error: 'fixtureId query param required' })
        return
      }

      const fixture = await prisma.fixture.findUnique({
        where: { id: fixtureId },
        include: {
          homeTeam: true,
          awayTeam: true,
          league: { select: { id: true, name: true, logoUrl: true } },
        },
      })
      if (!fixture) {
        res.status(404).json({ success: false, error: 'Fixture not found' })
        return
      }

      const actualResult = deriveActualResult(
        fixture.homeScore,
        fixture.awayScore
      )

      // findFirst rather than findUnique on the composite key — Prisma's
      // codegen for `@@unique([userId, fixtureId])` is conditional when
      // fixtureId is nullable in the schema, and we want this to compile
      // regardless of which generator output is in use.
      const userPredictionRow = await prisma.userPrediction.findFirst({
        where: { userId, fixtureId },
      })

      const userPrediction = userPredictionRow
        ? {
            predictedResult: userPredictionRow.predictedResult,
            predictedHomeScore: userPredictionRow.predictedHomeScore,
            predictedAwayScore: userPredictionRow.predictedAwayScore,
            // Recompute correctness on the fly so a stale stored value can't
            // diverge from the live fixture's outcome.
            wasCorrect:
              actualResult == null
                ? null
                : userPredictionRow.predictedResult === actualResult,
            scoreCorrect:
              fixture.homeScore == null || fixture.awayScore == null
                ? null
                : userPredictionRow.predictedHomeScore === fixture.homeScore &&
                  userPredictionRow.predictedAwayScore === fixture.awayScore,
          }
        : null

      res.json({
        success: true,
        data: {
          fixture: {
            id: fixture.id,
            matchDate: fixture.matchDate,
            status: fixture.status,
            homeScore: fixture.homeScore,
            awayScore: fixture.awayScore,
            homeTeam: { id: fixture.homeTeam.id, name: fixture.homeTeam.name },
            awayTeam: { id: fixture.awayTeam.id, name: fixture.awayTeam.name },
            league: fixture.league,
          },
          userPrediction,
          actualResult,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get ML model info
   * GET /api/predictions/model/info
   */
  async getModelInfo(
    _req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      const mlUrl = config.mlServiceUrl || 'http://localhost:8000'
      const response = await fetch(mlUrl + '/api/predictions/model/info', {
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) {
        res
          .status(502)
          .json({ success: false, error: 'ML service unavailable' })
        return
      }

      const data = await response.json()
      res.json({ success: true, data })
    } catch {
      res.status(502).json({ success: false, error: 'ML service unavailable' })
    }
  }

  /**
   * Proxy to the ml-service Dixon-Coles + value-bet engine.
   * POST /api/predictions/dixon-coles
   *
   * If the body already contains a `history` array it is forwarded as-is.
   * Otherwise the orchestrator builds history automatically from finished
   * fixtures in the DB: pass `fixtureId` (preferred — resolves league + team
   * names) or `leagueId` + `home` + `away` names. Optional pass-through:
   * neutral, xi, odds, kelly_fraction, min_edge, historyLimit.
   */
  async getDixonColes(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    // Captures the in-flight charge so an unexpected throw AFTER the debit
    // (e.g. a Redis hiccup on the final cache.set) still refunds the user
    // instead of leaving them charged with a bare 500.
    let pendingRefund: {
      userId: string
      refId: string | null
      paidKey: string | null
    } | null = null
    try {
      // Free mode disables manual on-demand analysis (unbounded provider cost).
      if (FREE_MODE) {
        res.status(403).json({ success: false, error: 'manual_disabled' })
        return
      }
      const userId = (req as any).user?.id as string | undefined
      if (!userId) {
        res
          .status(401)
          .json({ success: false, error: 'Authentication required' })
        return
      }

      const body = (req.body ?? {}) as Record<string, unknown>

      // One analysis per match, shared by everyone: the result is cached per
      // fixture (per odds set when entered manually), so repeat requests are
      // served from cache — no recompute, no odds API call. The computation
      // is shared but the fee is not: every user pays once per analysis; a
      // per-user paid marker (same TTL) keeps repeat clicks free.
      const oddsIn = body.odds as
        | { home?: number; draw?: number; away?: number }
        | undefined

      // Live awareness: a match that's underway must be analysed conditioned
      // on the current score + minute, not as if it were 0-0 pre-match. The
      // client sends its (freshest) view; the DB row is the fallback. The
      // live state also enters the cache key so a stale pre-match result is
      // never served mid-match.
      const liveState = await this.resolveLiveState(body)
      const DC_CACHE_TTL = liveState ? 5 * 60 : 3 * 60 * 60 // live drifts fast
      const DC_PAID_TTL = 7 * 24 * 60 * 60 // per-user "already paid" marker
      const liveKeyPart = liveState
        ? `:L${Math.floor(liveState.minute / 5)}-${liveState.home_goals}-${liveState.away_goals}`
        : ''
      const dcCacheKey =
        body.fixtureId != null
          ? cache.key(
              'dixon-coles',
              `${body.fixtureId}:${
                oddsIn ? `${oddsIn.home}-${oddsIn.draw}-${oddsIn.away}` : 'auto'
              }${liveKeyPart}`
            )
          : null
      // Paid marker is per fixture + user only (NOT per odds set): once a user
      // paid for a fixture's value analysis, re-running it — with different
      // odds, after the market opens, or just again — never charges twice.
      const dcPaidKey =
        body.fixtureId != null
          ? cache.key('dixon-coles-paid', String(body.fixtureId), userId)
          : null
      const alreadyPaid = dcPaidKey ? !!(await cache.get(dcPaidKey)) : false

      // Charge once per fixture per user. Returns false (already settled) when
      // the user has paid before; 402 is sent and the caller should stop.
      const ensurePaid = async (): Promise<
        { ok: true; balance?: number } | { ok: false }
      > => {
        if (alreadyPaid) return { ok: true }
        const d = await debitCredits({
          userId,
          amount: DIXON_COLES_COST,
          type: 'ML_PREDICTION',
          refId: body.fixtureId != null ? String(body.fixtureId) : null,
          metadata: {
            feature: 'dixon_coles',
            fixtureId: (body.fixtureId as number | null) ?? null,
          },
        })
        if (!d.ok) {
          res.status(402).json({
            success: false,
            error: 'insufficient_credits',
            balance: d.balance,
            required: d.required,
          })
          return { ok: false }
        }
        if (dcPaidKey) await cache.set(dcPaidKey, 1, DC_PAID_TTL)
        return { ok: true, balance: d.balance }
      }

      if (dcCacheKey) {
        const hit = await cache.get(dcCacheKey)
        if (hit) {
          const paid = await ensurePaid()
          if (!paid.ok) return
          res.json({
            success: true,
            data: { ...(hit as Record<string, unknown>), cached: true },
            ...(paid.balance != null ? { balance: paid.balance } : {}),
          })
          return
        }
      }

      let payload: Record<string, unknown> = body

      // Auto-build match history from the DB when the caller didn't supply it.
      // Done BEFORE any debit so we never charge when there's no data to fit.
      if (!Array.isArray(body.history) || body.history.length === 0) {
        const built = await this.buildDixonColesHistory(body)
        if (!built.ok) {
          res.status(built.status).json({ success: false, error: built.error })
          return
        }
        payload = {
          ...body,
          home: built.home,
          away: built.away,
          history: built.history,
          ratings_key: built.ratingsKey,
          // Neutral-venue tournaments: drop the model's home-field term.
          neutral: body.neutral === true || built.neutral,
        }
      }
      // Condition the model on the in-play state (final-result probabilities
      // given current score + minute). Cleared when not live.
      payload = { ...payload, live: liveState }

      // Auto-fetch 1X2 odds from API-Football when the caller didn't supply
      // them, so value analysis works from just a fixtureId.
      let oddsSource: 'manual' | 'market' | 'ai' =
        payload.odds != null ? 'manual' : 'market'
      if (payload.odds == null && body.fixtureId != null) {
        const odds = await this.fetchFixtureOdds(body.fixtureId)
        if (odds) payload = { ...payload, odds }
      }

      // Market not posted (tournaments / far-off matches): estimate fair odds
      // with AI instead of forcing the user to type them. Value computed
      // against these is indicative (model vs AI fair line), not true market
      // value — the UI labels it as such.
      if (payload.odds == null) {
        const aiOdds = await aiPredictionService.estimateOdds({
          home: String(payload.home ?? ''),
          away: String(payload.away ?? ''),
          league:
            typeof body.league === 'string'
              ? (body.league as string)
              : undefined,
        })
        if (aiOdds) {
          payload = { ...payload, odds: aiOdds }
          oddsSource = 'ai'
        }
      }

      // Still no odds (AI unavailable too) — refuse BEFORE charging.
      if (payload.odds == null) {
        res.status(422).json({ success: false, error: 'odds_unavailable' })
        return
      }

      const refId = body.fixtureId != null ? String(body.fixtureId) : null

      // Charge once per fixture per user (no second charge on re-runs). Only
      // a charge made THIS request is refundable on downstream failure.
      const chargedNow = !alreadyPaid
      const paid = await ensurePaid()
      if (!paid.ok) return
      let balanceAfter = paid.balance
      // Arm the crash-safety refund: if anything below throws before we
      // respond, the outer catch will undo this charge.
      if (chargedNow) pendingRefund = { userId, refId, paidKey: dcPaidKey }

      const refundIfCharged = async (reason: string, extra = {}) => {
        if (!chargedNow) return
        const r = await refundCredits({
          userId,
          amount: DIXON_COLES_COST,
          refId,
          metadata: { reason, ...extra },
        })
        balanceAfter = r.balance
        // a refund undoes the paid marker so the user can retry for free later
        if (dcPaidKey) await cache.delete(dcPaidKey)
        // handled explicitly — disarm the crash-safety net
        pendingRefund = null
      }

      const mlUrl = config.mlServiceUrl || 'http://localhost:8000'
      let mlRes: globalThis.Response
      try {
        mlRes = await fetch(mlUrl + '/api/predictions/dixon-coles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(20000),
        })
      } catch {
        await refundIfCharged('ml_service_unreachable')
        res.status(502).json({
          success: false,
          error: 'ML service unavailable',
          balance: balanceAfter,
        })
        return
      }

      const data = await mlRes.json().catch(() => ({}))
      if (!mlRes.ok) {
        await refundIfCharged('dixon_coles_failed', { status: mlRes.status })
        res.status(mlRes.status).json({
          success: false,
          error: 'dixon_coles_failed',
          detail: (data as { detail?: unknown })?.detail,
          balance: balanceAfter,
        })
        return
      }
      // Tag where the odds came from so the UI can label AI-estimated lines.
      const dataWithSource =
        data && typeof data === 'object' ? { ...data, oddsSource } : data

      // Share the computed analysis with every subsequent user (3h TTL —
      // odds drift over time, so don't keep it until kickoff). The paid
      // marker was already set by ensurePaid (longer TTL).
      if (dcCacheKey) {
        await cache.set(dcCacheKey, dataWithSource, DC_CACHE_TTL)
      }

      // Delivered successfully — no refund owed.
      pendingRefund = null
      res.json({
        success: true,
        data: dataWithSource,
        balance: balanceAfter,
        cost: DIXON_COLES_COST,
      })
    } catch (error) {
      // An unexpected throw AFTER the debit must not leave the user charged.
      let refundedBalance: number | undefined
      if (pendingRefund) {
        try {
          const r = await refundCredits({
            userId: pendingRefund.userId,
            amount: DIXON_COLES_COST,
            refId: pendingRefund.refId,
            metadata: { reason: 'dixon_coles_unhandled_error' },
          })
          refundedBalance = r.balance
          if (pendingRefund.paidKey) await cache.delete(pendingRefund.paidKey)
        } catch (refundErr) {
          logger.error(
            { error: refundErr, original: error },
            'Dixon-Coles refund-on-crash failed'
          )
        }
      }
      logger.error({ error }, 'getDixonColes failed')
      const detail = error instanceof Error ? error.message : String(error)
      res.status(500).json({
        success: false,
        error: 'dixon_coles_error',
        detail,
        ...(refundedBalance != null ? { balance: refundedBalance } : {}),
      })
    }
  }

  /**
   * GET /api/predictions/dixon-coles/:fixtureId — public, read-only,
   * credit-free Dixon-Coles + value analysis for ONE fixture. Powers the
   * automatic "Değer Sinyali" card in the free product: the same value engine
   * the value-bets cron uses, computed once per fixture and cached (no manual
   * odds entry, no charge). Conditions on the in-play state when the match is
   * underway. Returns the same `data` shape as the paid POST endpoint, so the
   * UI renders identically — only the trigger differs (automatic, not manual).
   */
  async getDixonColesAuto(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      const fixtureId = Number(req.params.fixtureId)
      if (!Number.isFinite(fixtureId)) {
        res.status(400).json({ success: false, error: 'invalid_fixture_id' })
        return
      }

      const liveState = await this.resolveLiveState({ fixtureId })
      const liveKeyPart = liveState
        ? `:L${Math.floor(liveState.minute / 5)}-${liveState.home_goals}-${liveState.away_goals}`
        : ''
      // Same cache namespace/value as the POST path's auto-odds variant: a
      // result computed by either surface serves the other.
      const cacheKey = cache.key(
        'dixon-coles',
        `${fixtureId}:auto${liveKeyPart}`
      )
      const hit = await cache.get(cacheKey)
      if (hit) {
        res.json({
          success: true,
          data: { ...(hit as Record<string, unknown>), cached: true },
        })
        return
      }

      const built = await this.buildDixonColesHistory({ fixtureId })
      if (!built.ok) {
        res.status(built.status).json({ success: false, error: built.error })
        return
      }

      // Odds: cached → market (API-Football) → AI fair-line estimate.
      const oddsKey = `odds:${fixtureId}`
      let oddsSource: 'market' | 'ai' = 'market'
      let odds = await cache.get<{ home: number; draw: number; away: number }>(
        oddsKey
      )
      if (!odds) {
        odds = await this.fetchFixtureOdds(fixtureId)
        if (odds) await cache.set(oddsKey, odds, 60 * 60 * 3)
      }
      if (!odds) {
        const aiOdds = await aiPredictionService.estimateOdds({
          home: built.home,
          away: built.away,
        })
        if (aiOdds) {
          odds = aiOdds
          oddsSource = 'ai'
        }
      }
      if (!odds) {
        res.status(422).json({ success: false, error: 'odds_unavailable' })
        return
      }

      const data = await this.callDixonMl({
        home: built.home,
        away: built.away,
        history: built.history,
        ratings_key: built.ratingsKey,
        neutral: built.neutral,
        odds,
        live: liveState,
        kelly_fraction: 0.25,
        min_edge: 0.03,
      })
      if (!data) {
        res.status(502).json({ success: false, error: 'dixon_coles_failed' })
        return
      }

      const payload = {
        fixture: `${built.home} vs ${built.away}`,
        probabilities: data.probabilities,
        value: data.value ?? [],
        oddsSource,
        live: liveState,
      }
      const ttl = liveState ? 5 * 60 : 3 * 60 * 60
      await cache.set(cacheKey, payload, ttl)
      res.json({ success: true, data: payload })
    } catch (error) {
      logger.error({ error }, 'getDixonColesAuto failed')
      res.status(500).json({ success: false, error: 'dixon_coles_error' })
    }
  }

  /**
   * Resolve the in-play state for a Dixon-Coles request. Client-supplied state
   * wins (it reflects what the user is looking at and live feeds on the web
   * are fresher than our DB row); otherwise the DB fixture row is used when
   * its status says the match is underway. Returns null for non-live matches.
   */
  private async resolveLiveState(body: Record<string, unknown>): Promise<{
    minute: number
    home_goals: number
    away_goals: number
  } | null> {
    const clamp = (n: number, lo: number, hi: number) =>
      Math.min(Math.max(Math.round(n), lo), hi)

    const fromClient = body.live as
      | { minute?: unknown; homeGoals?: unknown; awayGoals?: unknown }
      | undefined
    if (fromClient && typeof fromClient === 'object') {
      const m = Number(fromClient.minute)
      const h = Number(fromClient.homeGoals)
      const a = Number(fromClient.awayGoals)
      if ([m, h, a].every((n) => Number.isFinite(n) && n >= 0)) {
        return {
          minute: clamp(m, 0, 130),
          home_goals: clamp(h, 0, 30),
          away_goals: clamp(a, 0, 30),
        }
      }
    }

    if (body.fixtureId == null) return null
    const idNum = Number(body.fixtureId)
    if (!Number.isFinite(idNum)) return null
    const fx = await prisma.fixture.findFirst({
      where: { OR: [{ apiId: idNum }, { id: idNum }] },
      select: {
        status: true,
        minute: true,
        homeScore: true,
        awayScore: true,
        matchDate: true,
      },
    })
    if (!fx) return null
    if (fx.status !== 'LIVE' && fx.status !== 'HALFTIME') return null

    // Minute fallback when the live feed didn't store one: halftime is 45,
    // otherwise estimate from kickoff (clamped into the match).
    let minute = fx.minute ?? null
    if (minute == null) {
      if (fx.status === 'HALFTIME') minute = 45
      else {
        const elapsed = (Date.now() - fx.matchDate.getTime()) / 60000
        minute = clamp(elapsed, 1, 90)
      }
    }
    return {
      minute: clamp(minute, 0, 130),
      home_goals: fx.homeScore ?? 0,
      away_goals: fx.awayScore ?? 0,
    }
  }

  /**
   * Build Dixon-Coles match history from finished fixtures in the DB. Teams are
   * keyed by name (the model fits per-name), so the target home/away must appear
   * in the returned history or the fit cannot rate them.
   */
  private async buildDixonColesHistory(body: Record<string, unknown>): Promise<
    | {
        ok: true
        home: string
        away: string
        history: Array<Record<string, unknown>>
        ratingsKey: string
        neutral: boolean
      }
    | { ok: false; status: number; error: string }
  > {
    let leagueId: number | undefined =
      body.leagueId != null ? Number(body.leagueId) : undefined
    let homeName: string | undefined =
      typeof body.home === 'string' ? body.home : undefined
    let awayName: string | undefined =
      typeof body.away === 'string' ? body.away : undefined

    // fixtureId is authoritative: resolve league + canonical team names.
    if (body.fixtureId != null) {
      const apiId = Number(body.fixtureId)
      const include = {
        homeTeam: true,
        awayTeam: true,
        league: true,
      } as const
      let fx = await prisma.fixture.findFirst({
        where: { OR: [{ apiId }, { id: apiId }] },
        include,
      })

      // Not stored yet (clicked straight from the external feed): try to
      // pull it from API-Football by id.
      if (!fx) {
        const ensured = await fixtureService.ensureFixtureByApiId(apiId)
        if (ensured) {
          fx = await prisma.fixture.findFirst({
            where: { id: ensured.id },
            include,
          })
        }
      }

      // Ids from different providers (Football-Data vs API-Football) can
      // collide; trust the row only when caller-supplied names agree with it.
      if (fx && homeName && awayName) {
        const eq = (a: string, b: string) =>
          a.trim().toLowerCase() === b.trim().toLowerCase()
        if (!eq(fx.homeTeam.name, homeName) || !eq(fx.awayTeam.name, awayName))
          fx = null
      }

      if (fx) {
        leagueId = fx.leagueId
        homeName = fx.homeTeam.name
        awayName = fx.awayTeam.name
      } else if (!homeName || !awayName) {
        return { ok: false, status: 404, error: 'fixture_not_found' }
      }
    }

    if (!homeName || !awayName) {
      return { ok: false, status: 400, error: 'home_and_away_required' }
    }

    // Resolve the competition. Without a usable fixture row (provider id
    // mismatch), fall back to the most recent stored match of the home team.
    let leagueApiId: number | null = null
    let leagueName: string | null = null
    if (leagueId) {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
      })
      leagueApiId = league?.apiId ?? null
      leagueName = league?.name ?? null
    } else {
      const recent = await prisma.fixture.findFirst({
        where: {
          OR: [
            { homeTeam: { name: { equals: homeName, mode: 'insensitive' } } },
            { awayTeam: { name: { equals: homeName, mode: 'insensitive' } } },
          ],
        },
        orderBy: { matchDate: 'desc' },
        include: { league: true },
      })
      if (recent) {
        leagueId = recent.leagueId
        leagueApiId = recent.league.apiId
        leagueName = recent.league.name
      }
    }

    // National-team competitions share one rating pool: tournament-only
    // history is too thin to fit, but WC + qualifiers + Euro together work.
    // Detect by api id OR by competition name (covers fixtures stored under a
    // stray league row, e.g. created by the AI-prediction save path).
    const INTL_NAME_RE =
      /world cup|d[üu]nya kupas|euro|nations league|copa am[eé]rica|africa|afcon|asian cup|qualif|eleme|friendl|haz[ıi]rl[ıi]k|international|milli/i
    const bodyComp =
      typeof body.competitionType === 'string' ? body.competitionType : ''
    const international =
      (leagueApiId != null &&
        INTERNATIONAL_LEAGUE_API_IDS.includes(leagueApiId)) ||
      (leagueName != null && INTL_NAME_RE.test(leagueName)) ||
      bodyComp === 'international'

    // Neutral-venue tournaments (single host → no home advantage): the model
    // must NOT apply its home-field term. Qualifiers and friendlies keep real
    // home/away, so they're excluded. An explicit body.neutral overrides.
    const NEUTRAL_NAME_RE =
      /world cup|d[üu]nya kupas|copa am[eé]rica|afcon|africa cup|asian cup|gold cup|confederations|olympic|euro\b|avrupa şampiyona/i
    const neutral =
      body.neutral === true ||
      (leagueName != null &&
        NEUTRAL_NAME_RE.test(leagueName) &&
        !/qualif|eleme|haz[ıi]rl[ıi]k|friendl/i.test(leagueName))

    // Team completely unknown to the DB. During a tournament this is almost
    // always a national side whose history was never ingested — start the
    // international backfill and tell the client to retry shortly.
    if (!leagueId && !international) {
      if (await fixtureService.tryStartInternationalBackfill()) {
        return { ok: false, status: 422, error: 'history_building' }
      }
      return { ok: false, status: 404, error: 'fixture_not_found' }
    }

    const limit = Math.min(
      Math.max(
        Number(body.historyLimit ?? (international ? 800 : 400)) || 400,
        1
      ),
      1500
    )
    const include = {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    }
    const fixtures = await prisma.fixture.findMany({
      where: {
        status: 'FINISHED',
        homeScore: { not: null },
        awayScore: { not: null },
        ...(international
          ? { league: { apiId: { in: INTERNATIONAL_LEAGUE_API_IDS } } }
          : { leagueId }),
      },
      include,
      orderBy: { matchDate: 'desc' },
      take: limit,
    })

    // Recency window can exclude the target teams entirely (e.g. WC hosts
    // play no qualifiers, so their last matches are years old). Explicitly
    // pull each target team's own matches and merge them in.
    const mergeTeamMatches = async () => {
      const nameTerms = [homeName!, awayName!].flatMap((n) => [
        { homeTeam: { name: { equals: n, mode: 'insensitive' as const } } },
        { awayTeam: { name: { equals: n, mode: 'insensitive' as const } } },
      ])
      const teamMatches = await prisma.fixture.findMany({
        where: {
          status: 'FINISHED',
          homeScore: { not: null },
          awayScore: { not: null },
          league: { apiId: { in: INTERNATIONAL_LEAGUE_API_IDS } },
          OR: nameTerms,
        },
        include,
        orderBy: { matchDate: 'desc' },
        take: 40,
      })
      const seen = new Set(fixtures.map((f) => f.id))
      for (const f of teamMatches) {
        if (!seen.has(f.id)) {
          seen.add(f.id)
          fixtures.push(f)
        }
      }
    }
    if (international) await mergeTeamMatches()

    // Map normalized pool name -> canonical pool name, so a foreign-provider
    // input name (e.g. "Türkiye"/"South Korea") resolves to the pool's name
    // (e.g. "Turkey"/"Korea Republic") that the model actually fits on.
    const resolveBoth = () => {
      const poolByNorm = new Map<string, string>()
      for (const f of fixtures) {
        for (const n of [f.homeTeam.name, f.awayTeam.name]) {
          const k = normalizeTeam(n)
          if (!poolByNorm.has(k)) poolByNorm.set(k, n)
        }
      }
      return {
        home: resolveToPoolName(homeName!, poolByNorm),
        away: resolveToPoolName(awayName!, poolByNorm),
      }
    }
    let resolved = resolveBoth()

    // Last-resort self-heal: a team the pool doesn't know is fetched by name
    // straight from the API (search -> last 15 matches), stored, and the
    // request continues — no "try again later" for naming/coverage gaps.
    if (international && (!resolved.home || !resolved.away)) {
      let healed = false
      if (!resolved.home) {
        healed =
          (await fixtureService.loadTeamHistoryByName(homeName)) > 0 || healed
      }
      if (!resolved.away) {
        healed =
          (await fixtureService.loadTeamHistoryByName(awayName)) > 0 || healed
      }
      if (healed) {
        await mergeTeamMatches()
        resolved = resolveBoth()
      }
    }

    const history = fixtures.map((f) => ({
      home: f.homeTeam.name,
      away: f.awayTeam.name,
      home_goals: f.homeScore as number,
      away_goals: f.awayScore as number,
      match_date: f.matchDate.toISOString().slice(0, 10),
    }))

    const usable =
      history.length >= 20 && resolved.home != null && resolved.away != null

    // Thin or missing international history: backfill in the background and
    // ask the client to retry in a few minutes.
    if (!usable && international) {
      if (await fixtureService.tryStartInternationalBackfill()) {
        return { ok: false, status: 422, error: 'history_building' }
      }
    }

    if (history.length < 20) {
      return { ok: false, status: 422, error: 'insufficient_history' }
    }
    if (!resolved.home || !resolved.away) {
      return { ok: false, status: 422, error: 'teams_not_in_history' }
    }
    // Use canonical names so ml-service can rate the teams from the pool.
    homeName = resolved.home
    awayName = resolved.away

    return {
      ok: true,
      home: homeName,
      away: awayName,
      history,
      ratingsKey: international ? 'INTL' : `L${leagueId}`,
      neutral,
    }
  }

  /**
   * Fetch best (highest) 1X2 decimal odds across bookmakers for a fixture from
   * API-Football. Returns null when odds aren't available (e.g. the account is
   * inactive, or the fixture has no posted market yet).
   */
  private async fetchFixtureOdds(
    fixtureIdLike: unknown
  ): Promise<{ home: number; draw: number; away: number } | null> {
    const idNum = Number(fixtureIdLike)
    if (!Number.isFinite(idNum)) return null

    // Resolve our row (teams + date + league) so we can self-heal a wrong
    // API-Football fixture id — odds are keyed by AF's id, which can differ
    // from the id we stored (cross-provider / name-resolved fixtures).
    const fx = await prisma.fixture.findFirst({
      where: { OR: [{ apiId: idNum }, { id: idNum }] },
      select: {
        apiId: true,
        matchDate: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        league: { select: { apiId: true } },
      },
    })
    const apiFixtureId = fx?.apiId ?? idNum

    const tryOdds = async (
      fixtureId: number
    ): Promise<{ home: number; draw: number; away: number } | null> => {
      try {
        const data = await apiFootballClient.getOdds({ fixture: fixtureId })
        return this.parseBest1x2(data)
      } catch {
        return null
      }
    }

    // 1) Direct: our stored id IS the AF fixture id (common case).
    const direct = await tryOdds(apiFixtureId)
    if (direct) return direct

    // 2) Self-heal: find the real AF fixture by team names on the match date,
    //    then fetch odds for THAT id. Covers id mismatches that silently
    //    returned no odds above.
    if (fx?.matchDate && fx.homeTeam?.name && fx.awayTeam?.name) {
      const resolvedId = await this.resolveApiFootballFixtureId(
        fx.homeTeam.name,
        fx.awayTeam.name,
        fx.matchDate,
        fx.league?.apiId ?? null
      )
      if (resolvedId && resolvedId !== apiFixtureId) {
        const healed = await tryOdds(resolvedId)
        // NOTE: deliberately NOT rewriting fixture.apiId here — apiId is the
        // row's public identity (links in the value cache, reports, hero
        // cards). Rewriting it broke existing links ("maç bulunamadı"). The
        // af-fixture-id cache already makes future odds lookups fast.
        if (healed) return healed
      }
    }

    return null
  }

  /**
   * Find the API-Football fixture id for a match by team names + date. Tries
   * the match date and the day either side (timezone drift), matching teams by
   * normalized name. Returns null when no confident match is found.
   */
  private async resolveApiFootballFixtureId(
    home: string,
    away: string,
    matchDate: Date,
    leagueApiId: number | null
  ): Promise<number | null> {
    const cacheKey = cache.key(
      'af-fixture-id',
      `${normalizeTeam(home)}|${normalizeTeam(away)}|${matchDate
        .toISOString()
        .slice(0, 10)}`
    )
    const cached = await cache.get<number>(cacheKey)
    if (cached) return cached

    const days = [0, -1, 1].map((delta) =>
      new Date(matchDate.getTime() + delta * 86400000)
        .toISOString()
        .slice(0, 10)
    )
    const wantH = normalizeTeam(home)
    const wantA = normalizeTeam(away)
    const season = matchDate.getUTCFullYear()

    for (const date of days) {
      try {
        const data = await apiFootballClient.getFixtures({
          date,
          ...(leagueApiId ? { league: leagueApiId, season } : {}),
        })
        const rows = (data?.response ?? []) as any[]
        for (const r of rows) {
          const h = normalizeTeam(r?.teams?.home?.name ?? '')
          const a = normalizeTeam(r?.teams?.away?.name ?? '')
          const id = Number(r?.fixture?.id)
          if (!Number.isFinite(id)) continue
          const match =
            (h === wantH && a === wantA) || (h === wantA && a === wantH)
          if (match) {
            await cache.set(cacheKey, id, 24 * 60 * 60)
            return id
          }
        }
      } catch {
        // try next date
      }
    }
    return null
  }

  private parseBest1x2(
    data: any
  ): { home: number; draw: number; away: number } | null {
    const best = { home: 0, draw: 0, away: 0 }
    const books = data?.response?.[0]?.bookmakers ?? []
    for (const book of books) {
      const market = (book.bets ?? []).find(
        (b: any) => b.id === 1 || b.name === 'Match Winner'
      )
      for (const v of market?.values ?? []) {
        const odd = parseFloat(v.odd)
        if (!Number.isFinite(odd)) continue
        if (v.value === 'Home') best.home = Math.max(best.home, odd)
        else if (v.value === 'Draw') best.draw = Math.max(best.draw, odd)
        else if (v.value === 'Away') best.away = Math.max(best.away, odd)
      }
    }
    if (best.home > 1 && best.draw > 1 && best.away > 1) return best
    return null
  }

  /**
   * GET /api/predictions/report/:fixtureId  (public, free)
   * Post-match report for a finished fixture; generated on demand if the
   * cron hasn't produced it yet.
   */
  async getReport(req: Request, res: Response): Promise<void> {
    const idNum = Number(req.params.fixtureId)
    if (!Number.isFinite(idNum)) {
      res.status(400).json({ success: false, error: 'invalid_fixture_id' })
      return
    }
    try {
      const report = await reportService.getForFixture(idNum)
      if (!report) {
        res.status(404).json({ success: false, error: 'report_not_found' })
        return
      }
      res.json({ success: true, data: report })
    } catch (error) {
      logger.error({ error, fixtureId: idNum }, 'getReport failed')
      res.status(500).json({
        success: false,
        error: 'report_failed',
        detail: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * GET /api/predictions/reports[?team=NAME][&limit=N]  (public, free)
   * With ?team= → recent reports involving that team (prediction context).
   * Without → latest reports across all competitions ("Maç Sonu" page).
   */
  async getTeamReports(req: Request, res: Response): Promise<void> {
    const team = typeof req.query.team === 'string' ? req.query.team : null
    const limit = Number(req.query.limit) || (team ? 3 : 20)
    try {
      const reports = team
        ? await reportService.getRecentForTeam(team, limit)
        : await reportService.getRecent(limit)
      res.json({ success: true, data: reports })
    } catch (error) {
      logger.error({ error, team }, 'getTeamReports failed')
      res.status(500).json({ success: false, error: 'reports_failed' })
    }
  }

  /**
   * Stable per-user refId for a fixture's pre-match report purchase. Distinct
   * from the plain AI-prediction marker (`<fixtureId>`) so the two paywalls
   * don't collide: a user can have paid for the prediction but not the report.
   */
  private preReportRefId(idNum: number): string {
    return `report:${idNum}`
  }

  /** Has this user already unlocked the pre-match report for this fixture? */
  private async hasPaidForPreReport(
    userId: string,
    idNum: number
  ): Promise<boolean> {
    const row = await prisma.creditTransaction.findFirst({
      where: {
        userId,
        type: 'AI_PREDICTION',
        refId: this.preReportRefId(idNum),
        delta: { lt: 0 },
      },
      select: { id: true },
    })
    return !!row
  }

  /**
   * GET /api/predictions/inplay/:fixtureId  (public, free)
   * In-play ("maç arası") read for a live / half-time match — generated on
   * demand and cached. Returns a null summary (not an error) when the match
   * isn't underway.
   */
  async getInPlay(req: Request, res: Response): Promise<void> {
    const idNum = Number(req.params.fixtureId)
    if (!Number.isFinite(idNum)) {
      res.status(400).json({ success: false, error: 'invalid_fixture_id' })
      return
    }
    try {
      const data = await reportService.ensureInPlay(idNum)
      if (!data) {
        res.status(404).json({ success: false, error: 'fixture_not_found' })
        return
      }
      res.json({ success: true, data })
    } catch (error) {
      logger.error({ error, fixtureId: idNum }, 'getInPlay failed')
      res.status(500).json({ success: false, error: 'inplay_failed' })
    }
  }

  /**
   * GET /api/predictions/likes/:fixtureId[?voterId=]  (public)
   * Like count for a match + whether this voter already liked it.
   */
  async getLikes(req: Request, res: Response): Promise<void> {
    const idNum = Number(req.params.fixtureId)
    if (!Number.isFinite(idNum)) {
      res.status(400).json({ success: false, error: 'invalid_fixture_id' })
      return
    }
    const voterId =
      typeof req.query.voterId === 'string'
        ? req.query.voterId.slice(0, 64)
        : undefined
    try {
      const data = await reportService.getLikes(idNum, voterId)
      res.json({ success: true, data })
    } catch (error) {
      logger.error({ error, fixtureId: idNum }, 'getLikes failed')
      res.status(500).json({ success: false, error: 'likes_failed' })
    }
  }

  /**
   * POST /api/predictions/likes/:fixtureId  body: { voterId }  (public)
   * Toggle this voter's like; returns the fresh count + state.
   */
  async toggleLike(req: Request, res: Response): Promise<void> {
    const idNum = Number(req.params.fixtureId)
    if (!Number.isFinite(idNum)) {
      res.status(400).json({ success: false, error: 'invalid_fixture_id' })
      return
    }
    const raw = (req.body as { voterId?: unknown })?.voterId
    const voterId = typeof raw === 'string' ? raw.trim().slice(0, 64) : ''
    if (!voterId) {
      res.status(400).json({ success: false, error: 'voterId required' })
      return
    }
    try {
      const data = await reportService.toggleLike(idNum, voterId)
      res.json({ success: true, data })
    } catch (error) {
      logger.error({ error, fixtureId: idNum }, 'toggleLike failed')
      res.status(500).json({ success: false, error: 'likes_failed' })
    }
  }

  /**
   * GET /api/predictions/report-cards  (public)
   * The reports list: upcoming + recently finished matches, each as a card
   * carrying both phases' (Önce/Sonra) availability.
   */
  async getReportCards(req: Request, res: Response): Promise<void> {
    const limit = Number(req.query.limit) || 30
    try {
      const cards = await reportService.listReportCards(limit)
      res.json({ success: true, data: cards })
    } catch (error) {
      logger.error({ error }, 'getReportCards failed')
      res.status(500).json({ success: false, error: 'report_cards_failed' })
    }
  }

  /**
   * GET /api/predictions/pre-report/status?fixtureId=N  (auth)
   * Drives the "Önce" report card's empty-state: does the fixture exist, has
   * THIS viewer already paid (re-viewing is free), is it finished/live, and
   * does a pre-match prediction exist yet?
   */
  async getPreReportStatus(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.id as string | undefined
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }
    const idNum = Number(req.query.fixtureId)
    if (!Number.isFinite(idNum)) {
      res.status(400).json({ success: false, error: 'fixtureId required' })
      return
    }
    try {
      const fx = await prisma.fixture.findFirst({
        where: { OR: [{ apiId: idNum }, { id: idNum }] },
        select: {
          id: true,
          status: true,
          _count: { select: { predictions: true } },
        },
      })
      const paid = fx ? await this.hasPaidForPreReport(userId, idNum) : false
      const isPast = fx?.status === 'FINISHED'
      res.json({
        success: true,
        data: {
          available: !!fx,
          paid,
          finished: isPast,
          live: fx?.status === 'LIVE' || fx?.status === 'HALFTIME',
          hasPrediction: (fx?._count.predictions ?? 0) > 0,
          // Past (finished) match → archival pre-report at half price.
          cost: isPast ? PRE_REPORT_PAST_COST : PRE_REPORT_COST,
        },
      })
    } catch (error) {
      logger.error({ error, fixtureId: idNum }, 'getPreReportStatus failed')
      res.status(500).json({ success: false, error: 'status_failed' })
    }
  }

  /**
   * POST /api/predictions/pre-report  (auth, 6 credits)
   * Body: { fixtureId }. Returns the PRE-MATCH report ("Önce"): prediction +
   * mined form/stats/H2H + in-play read. Compute-once, shared: the report is
   * built before any charge, so a build failure never costs the user. Each
   * user pays once per fixture; re-viewing is free.
   */
  async getPreReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user?.id as string | undefined
      if (!userId) {
        res
          .status(401)
          .json({ success: false, error: 'Authentication required' })
        return
      }
      const idNum = Number((req.body as { fixtureId?: unknown })?.fixtureId)
      if (!Number.isFinite(idNum)) {
        res.status(400).json({ success: false, error: 'fixtureId required' })
        return
      }

      // Build BEFORE charging: a missing fixture or generation error must not
      // debit the user.
      const report = await reportService.buildPreReport(idNum)
      if (!report) {
        res.status(404).json({ success: false, error: 'report_not_found' })
        return
      }

      // Already unlocked → serve free (re-view).
      if (await this.hasPaidForPreReport(userId, idNum)) {
        res.json({ success: true, data: report, cached: true })
        return
      }

      // Past (finished) match → archival pre-report at half price.
      const cost = report.finished ? PRE_REPORT_PAST_COST : PRE_REPORT_COST
      const debit = await debitCredits({
        userId,
        amount: cost,
        type: 'AI_PREDICTION',
        refId: this.preReportRefId(idNum),
        metadata: {
          feature: 'pre_report',
          fixtureId: idNum,
          past: report.finished,
        },
      })
      if (!debit.ok) {
        res.status(402).json({
          success: false,
          error: 'insufficient_credits',
          balance: debit.balance,
          required: debit.required,
        })
        return
      }

      res.json({
        success: true,
        data: report,
        cached: false,
        balance: debit.balance,
        cost,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/predictions/analytics?league=APIID[&home=NAME&away=NAME]
   * (public, cached) Measurable analytics mined from the archive:
   * - without home/away: the org's full strength table + top scorers
   * - with home/away: the matchup view (both teams' strength/form rows +
   *   their key players) for the match page's power-comparison card
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    const leagueApiId = Number(req.query.league)
    if (!Number.isFinite(leagueApiId)) {
      res.status(400).json({ success: false, error: 'league_required' })
      return
    }
    const home = typeof req.query.home === 'string' ? req.query.home : null
    const away = typeof req.query.away === 'string' ? req.query.away : null
    try {
      if (home && away) {
        const [hs, as, hp, ap] = await Promise.all([
          analyticsService.teamStrength(leagueApiId, home),
          analyticsService.teamStrength(leagueApiId, away),
          analyticsService.teamPlayers(leagueApiId, home, 5),
          analyticsService.teamPlayers(leagueApiId, away, 5),
        ])
        res.json({
          success: true,
          data: {
            home: hs ? { ...hs, players: hp } : null,
            away: as ? { ...as, players: ap } : null,
          },
        })
        return
      }
      const [teams, players] = await Promise.all([
        analyticsService.teamStrengths(leagueApiId),
        analyticsService.topPlayers(leagueApiId, 10),
      ])
      res.json({ success: true, data: { teams, players } })
    } catch (error) {
      logger.error({ error, leagueApiId }, 'getAnalytics failed')
      res.status(500).json({ success: false, error: 'analytics_failed' })
    }
  }

  /**
   * GET /api/predictions/value-bets  (public, cheap)
   * Serves the pre-computed value-bet list from Redis. No external calls, so
   * list views (home, "Değerli Bahisler") cost nothing per page load.
   */
  async getValueBets(_req: Request, res: Response): Promise<void> {
    const cached = await cache.get<{
      updatedAt: string
      items: ValueBetItem[]
    }>(VALUE_BETS_KEY)
    res.json({
      success: true,
      data: cached ?? { updatedAt: null, items: [] },
    })
  }

  /**
   * POST /api/predictions/value-bets/refresh  (admin only)
   * Runs the Dixon-Coles value engine across upcoming curated fixtures and
   * caches the result. Cost-guarded: a short cooldown lock, a hard fixture cap,
   * and per-fixture odds caching so repeated runs don't re-hit the odds quota.
   */
  async refreshValueBets(req: Request, res: Response): Promise<void> {
    const force = String(req.query?.force ?? '') === '1'
    if (!force && (await cache.get(VALUE_BETS_LOCK))) {
      res.status(429).json({ success: false, error: 'cooldown_active' })
      return
    }
    const result = await this.computeAndCacheValueBets()
    res.json({ success: true, data: result })
  }

  /**
   * Core value-bet computation shared by the admin HTTP handler and the cron
   * job. Runs the Dixon-Coles value engine over upcoming curated fixtures and
   * caches both the value picks and the full 1X2 odds map. Sets a 10-minute
   * lock so overlapping runs (cron + manual) don't double-hit the odds quota.
   */
  async computeAndCacheValueBets(): Promise<{
    processed: number
    valueBets: number
    oddsMisses: number
    fixturesFound: number
  }> {
    await cache.set(VALUE_BETS_LOCK, { at: new Date().toISOString() }, 600)

    const now = new Date()
    const horizon = new Date(Date.now() + 1000 * 60 * 60 * 24 * 4) // 4 days
    const fixtures = await prisma.fixture.findMany({
      where: {
        status: 'SCHEDULED',
        matchDate: { gte: now, lte: horizon },
        league: { apiId: { in: [...CURATED_LEAGUE_IDS] } },
      },
      include: { homeTeam: true, awayTeam: true, league: true },
      orderBy: { matchDate: 'asc' },
      take: 60,
    })

    const items: ValueBetItem[] = []
    // Full 1X2 odds for every fixture that had a market (value or not), so
    // the matches list can show market odds beyond just the value picks.
    const odds: {
      fixtureId: number
      home: string
      away: string
      odds: { home: number; draw: number; away: number }
    }[] = []
    let processed = 0
    let oddsMisses = 0
    for (const fx of fixtures) {
      processed++
      const result = await this.computeValueForFixture(fx)
      if (result === 'no_odds') oddsMisses++
      else if (result) items.push(result)
      // computeValueForFixture caches odds under `odds:<apiId>`; reuse it.
      const o = await cache.get<{ home: number; draw: number; away: number }>(
        `odds:${fx.apiId}`
      )
      if (o)
        odds.push({
          fixtureId: fx.apiId,
          home: fx.homeTeam.name,
          away: fx.awayTeam.name,
          odds: o,
        })
    }
    items.sort((a, b) => b.edge - a.edge)

    await cache.set(
      VALUE_BETS_KEY,
      { updatedAt: new Date().toISOString(), items, odds },
      60 * 60 * 12 // 12h
    )

    return {
      processed,
      valueBets: items.length,
      oddsMisses,
      fixturesFound: fixtures.length,
    }
  }

  /**
   * Compute the single best value bet for one fixture, or null when there's no
   * edge / no history, or the sentinel 'no_odds' when odds are unavailable.
   */
  private async computeValueForFixture(fx: {
    apiId: number
    matchDate: Date
    homeTeam: { name: string }
    awayTeam: { name: string }
    league: { id: number; name: string }
  }): Promise<ValueBetItem | 'no_odds' | null> {
    const built = await this.buildDixonColesHistory({ fixtureId: fx.apiId })
    if (!built.ok) return null

    const oddsKey = `odds:${fx.apiId}`
    let odds = await cache.get<{ home: number; draw: number; away: number }>(
      oddsKey
    )
    if (!odds) {
      odds = await this.fetchFixtureOdds(fx.apiId)
      if (odds) await cache.set(oddsKey, odds, 60 * 60 * 3) // 3h
    }
    if (!odds) return 'no_odds'

    const data = await this.callDixonMl({
      home: built.home,
      away: built.away,
      history: built.history,
      ratings_key: built.ratingsKey,
      neutral: built.neutral,
      odds,
      kelly_fraction: 0.25,
      min_edge: 0.03,
    })
    if (!data) return null

    const values = (data.value ?? []) as MlValueBet[]
    const best = values
      .filter((v) => v.is_value)
      .sort((a, b) => b.edge - a.edge)[0]
    if (!best) return null

    const pickLabel =
      best.selection === 'home'
        ? fx.homeTeam.name
        : best.selection === 'away'
          ? fx.awayTeam.name
          : 'Beraberlik'

    return {
      fixtureId: fx.apiId,
      league: { id: fx.league.id, name: fx.league.name },
      home: fx.homeTeam.name,
      away: fx.awayTeam.name,
      matchDate: fx.matchDate.toISOString(),
      selection: best.selection,
      pickLabel,
      odds: best.odds,
      modelProb: best.model_prob,
      marketProb: best.market_prob_vigfree,
      edge: best.edge,
      evPerUnit: best.ev_per_unit,
      recKelly: best.rec_kelly,
      probs: {
        home: data.probabilities?.home_win ?? 0,
        draw: data.probabilities?.draw ?? 0,
        away: data.probabilities?.away_win ?? 0,
      },
    }
  }

  /** Call ml-service Dixon-Coles directly (internal batch — no credits). */
  private async callDixonMl(
    payload: Record<string, unknown>
  ): Promise<DixonMlResult | null> {
    const mlUrl = config.mlServiceUrl || 'http://localhost:8000'
    try {
      const r = await fetch(mlUrl + '/api/predictions/dixon-coles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      })
      if (!r.ok) return null
      return (await r.json()) as DixonMlResult
    } catch {
      return null
    }
  }
}

export const predictionController = new PredictionController()
