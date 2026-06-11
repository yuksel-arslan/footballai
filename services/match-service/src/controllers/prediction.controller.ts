import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@football-ai/database'
import { aiPredictionService } from '../services/ai-prediction.service'
import {
  debitCredits,
  refundCredits,
  ML_PREDICTION_COST,
  DIXON_COLES_COST,
} from '../services/credit.service'
import { apiFootballClient } from '../services/api-football'
import { cache } from '../services/cache'
import {
  CURATED_LEAGUE_IDS,
  INTERNATIONAL_LEAGUE_API_IDS,
  fixtureService,
} from '../services/fixture-service'
import { config } from '../config'

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

      res.json({
        apiFootballKeyPresent: keyPresent,
        internationalFinishedInDb: intlPool,
        finishedFixturesTotal: finishedTotal,
        apiFootballProbe_WC2022: probe,
        backfill: { running: !!running, done: !!done, cooldown: !!cooldown },
        ...(nameCheck ? { nameCheck } : {}),
        ...(historyCheck ? { historyCheck } : {}),
        ...(wcSweep ? { wcSweep } : {}),
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

      const body = (req.body ?? {}) as Record<string, unknown>

      // One analysis per match, shared by everyone: the result is cached per
      // fixture (per odds set when entered manually), so repeat requests are
      // served from cache — no recompute, no odds API call. The computation
      // is shared but the fee is not: every user pays once per analysis; a
      // per-user paid marker (same TTL) keeps repeat clicks free.
      const oddsIn = body.odds as
        | { home?: number; draw?: number; away?: number }
        | undefined
      const DC_CACHE_TTL = 3 * 60 * 60 // result cache (odds drift)
      const DC_PAID_TTL = 7 * 24 * 60 * 60 // per-user "already paid" marker
      const dcCacheKey =
        body.fixtureId != null
          ? cache.key(
              'dixon-coles',
              `${body.fixtureId}:${
                oddsIn ? `${oddsIn.home}-${oddsIn.draw}-${oddsIn.away}` : 'auto'
              }`
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
        }
      }

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

      res.json({
        success: true,
        data: dataWithSource,
        balance: balanceAfter,
        cost: DIXON_COLES_COST,
      })
    } catch (error) {
      next(error)
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

    // Odds are keyed by the API-Football fixture id; resolve it from our row.
    const fx = await prisma.fixture.findFirst({
      where: { OR: [{ apiId: idNum }, { id: idNum }] },
      select: { apiId: true },
    })
    const apiFixtureId = fx?.apiId ?? idNum

    try {
      const data = await apiFootballClient.getOdds({ fixture: apiFixtureId })
      return this.parseBest1x2(data)
    } catch {
      return null
    }
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
    let processed = 0
    let oddsMisses = 0
    for (const fx of fixtures) {
      processed++
      const result = await this.computeValueForFixture(fx)
      if (result === 'no_odds') oddsMisses++
      else if (result) items.push(result)
    }
    items.sort((a, b) => b.edge - a.edge)

    await cache.set(
      VALUE_BETS_KEY,
      { updatedAt: new Date().toISOString(), items },
      60 * 60 * 12 // 12h
    )

    res.json({
      success: true,
      data: {
        processed,
        valueBets: items.length,
        oddsMisses,
        fixturesFound: fixtures.length,
      },
    })
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
  private async callDixonMl(payload: Record<string, unknown>): Promise<{
    value?: MlValueBet[]
    probabilities?: { home_win: number; draw: number; away_win: number }
  } | null> {
    const mlUrl = config.mlServiceUrl || 'http://localhost:8000'
    try {
      const r = await fetch(mlUrl + '/api/predictions/dixon-coles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      })
      if (!r.ok) return null
      return (await r.json()) as {
        value?: MlValueBet[]
        probabilities?: { home_win: number; draw: number; away_win: number }
      }
    } catch {
      return null
    }
  }
}

export const predictionController = new PredictionController()
