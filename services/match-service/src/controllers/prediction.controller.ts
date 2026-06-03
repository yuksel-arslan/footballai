import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@football-ai/database'
import { aiPredictionService } from '../services/ai-prediction.service'
import {
  debitCredits,
  refundCredits,
  ML_PREDICTION_COST,
} from '../services/credit.service'
import { config } from '../config'

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
      const body = (req.body ?? {}) as Record<string, unknown>
      let payload: Record<string, unknown> = body

      // Auto-build match history from the DB when the caller didn't supply it.
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
        }
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
        res
          .status(502)
          .json({ success: false, error: 'ML service unavailable' })
        return
      }

      const data = await mlRes.json().catch(() => ({}))
      if (!mlRes.ok) {
        res.status(mlRes.status).json({
          success: false,
          error: 'dixon_coles_failed',
          detail: (data as { detail?: unknown })?.detail,
        })
        return
      }
      res.json({ success: true, data })
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
      const fx = await prisma.fixture.findFirst({
        where: { OR: [{ apiId }, { id: apiId }] },
        include: { homeTeam: true, awayTeam: true },
      })
      if (!fx) return { ok: false, status: 404, error: 'fixture_not_found' }
      leagueId = fx.leagueId
      homeName = fx.homeTeam.name
      awayName = fx.awayTeam.name
    }

    if (!leagueId) {
      return { ok: false, status: 400, error: 'fixtureId_or_leagueId_required' }
    }
    if (!homeName || !awayName) {
      return { ok: false, status: 400, error: 'home_and_away_required' }
    }

    const limit = Math.min(
      Math.max(Number(body.historyLimit ?? 400) || 400, 1),
      1000
    )
    const fixtures = await prisma.fixture.findMany({
      where: {
        status: 'FINISHED',
        leagueId,
        homeScore: { not: null },
        awayScore: { not: null },
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

    if (history.length < 20) {
      return { ok: false, status: 422, error: 'insufficient_history' }
    }
    const names = new Set<string>()
    for (const h of history) {
      names.add(h.home)
      names.add(h.away)
    }
    if (!names.has(homeName) || !names.has(awayName)) {
      return { ok: false, status: 422, error: 'teams_not_in_history' }
    }

    return { ok: true, home: homeName, away: awayName, history }
  }
}

export const predictionController = new PredictionController()
