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
      const DC_CACHE_TTL = 3 * 60 * 60
      const dcCacheKey =
        body.fixtureId != null
          ? cache.key(
              'dixon-coles',
              `${body.fixtureId}:${
                oddsIn ? `${oddsIn.home}-${oddsIn.draw}-${oddsIn.away}` : 'auto'
              }`
            )
          : null
      const dcPaidKey =
        body.fixtureId != null
          ? cache.key('dixon-coles-paid', String(body.fixtureId), userId)
          : null
      if (dcCacheKey) {
        const hit = await cache.get(dcCacheKey)
        if (hit) {
          const alreadyPaid = dcPaidKey ? await cache.get(dcPaidKey) : null
          if (alreadyPaid) {
            res.json({
              success: true,
              data: { ...(hit as Record<string, unknown>), cached: true },
            })
            return
          }
          const cachedDebit = await debitCredits({
            userId,
            amount: DIXON_COLES_COST,
            type: 'ML_PREDICTION',
            refId: String(body.fixtureId),
            metadata: {
              feature: 'dixon_coles',
              fixtureId: body.fixtureId,
              cached: true,
            },
          })
          if (!cachedDebit.ok) {
            res.status(402).json({
              success: false,
              error: 'insufficient_credits',
              balance: cachedDebit.balance,
              required: cachedDebit.required,
            })
            return
          }
          if (dcPaidKey) await cache.set(dcPaidKey, 1, DC_CACHE_TTL)
          res.json({
            success: true,
            data: { ...(hit as Record<string, unknown>), cached: true },
            balance: cachedDebit.balance,
            cost: DIXON_COLES_COST,
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
      if (payload.odds == null && body.fixtureId != null) {
        const odds = await this.fetchFixtureOdds(body.fixtureId)
        if (odds) payload = { ...payload, odds }
      }

      // Value analysis needs odds (auto or manual). Refuse BEFORE charging so
      // the user isn't billed when we can't deliver value; the UI then offers
      // manual odds entry.
      if (payload.odds == null) {
        res.status(422).json({ success: false, error: 'odds_unavailable' })
        return
      }

      const refId = body.fixtureId != null ? String(body.fixtureId) : null

      // Premium feature: debit before calling ml-service; refund on any failure.
      const debit = await debitCredits({
        userId,
        amount: DIXON_COLES_COST,
        type: 'ML_PREDICTION',
        refId,
        metadata: { feature: 'dixon_coles', fixtureId: body.fixtureId ?? null },
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
      let mlRes: globalThis.Response
      try {
        mlRes = await fetch(mlUrl + '/api/predictions/dixon-coles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(20000),
        })
      } catch {
        const refund = await refundCredits({
          userId,
          amount: DIXON_COLES_COST,
          refId,
          metadata: {
            reason: 'ml_service_unreachable',
            originalDebitId: debit.transactionId,
          },
        })
        res.status(502).json({
          success: false,
          error: 'ML service unavailable',
          balance: refund.balance,
        })
        return
      }

      const data = await mlRes.json().catch(() => ({}))
      if (!mlRes.ok) {
        const refund = await refundCredits({
          userId,
          amount: DIXON_COLES_COST,
          refId,
          metadata: {
            reason: 'dixon_coles_failed',
            status: mlRes.status,
            originalDebitId: debit.transactionId,
          },
        })
        res.status(mlRes.status).json({
          success: false,
          error: 'dixon_coles_failed',
          detail: (data as { detail?: unknown })?.detail,
          balance: refund.balance,
        })
        return
      }
      // Share the computed analysis with every subsequent user (3h TTL —
      // odds drift over time, so don't keep it until kickoff). Mark this
      // user as paid so their own repeat clicks stay free.
      if (dcCacheKey) {
        await cache.set(dcCacheKey, data, DC_CACHE_TTL)
      }
      if (dcPaidKey) {
        await cache.set(dcPaidKey, 1, DC_CACHE_TTL)
      }

      res.json({
        success: true,
        data,
        balance: debit.balance,
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
    if (leagueId) {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
      })
      leagueApiId = league?.apiId ?? null
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
      }
    }

    // Team completely unknown to the DB. During a tournament this is almost
    // always a national side whose history was never ingested — start the
    // international backfill and tell the client to retry shortly.
    if (!leagueId) {
      if (fixtureService.tryStartInternationalBackfill()) {
        return { ok: false, status: 422, error: 'history_building' }
      }
      return { ok: false, status: 404, error: 'fixture_not_found' }
    }

    // National-team competitions share one rating pool: tournament-only
    // history is too thin to fit, but WC + qualifiers + Euro together work.
    const international =
      leagueApiId != null && INTERNATIONAL_LEAGUE_API_IDS.includes(leagueApiId)

    const limit = Math.min(
      Math.max(Number(body.historyLimit ?? 400) || 400, 1),
      1000
    )
    const fixtures = await prisma.fixture.findMany({
      where: {
        status: 'FINISHED',
        homeScore: { not: null },
        awayScore: { not: null },
        ...(international
          ? { league: { apiId: { in: INTERNATIONAL_LEAGUE_API_IDS } } }
          : { leagueId }),
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
      orderBy: { matchDate: 'desc' },
      take: limit,
    })

    const history = fixtures.map((f) => ({
      home: f.homeTeam.name,
      away: f.awayTeam.name,
      home_goals: f.homeScore as number,
      away_goals: f.awayScore as number,
      match_date: f.matchDate.toISOString().slice(0, 10),
    }))

    const names = new Set<string>()
    for (const h of history) {
      names.add(h.home)
      names.add(h.away)
    }
    const usable =
      history.length >= 20 && names.has(homeName) && names.has(awayName)

    // Thin or missing international history: backfill in the background and
    // ask the client to retry in a few minutes.
    if (!usable && international) {
      if (fixtureService.tryStartInternationalBackfill()) {
        return { ok: false, status: 422, error: 'history_building' }
      }
    }

    if (history.length < 20) {
      return { ok: false, status: 422, error: 'insufficient_history' }
    }
    if (!names.has(homeName) || !names.has(awayName)) {
      return { ok: false, status: 422, error: 'teams_not_in_history' }
    }

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
