'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { getApiBaseUrl } from '@/lib/env'

export interface PredictionData {
  id: string
  fixtureId: number
  homeWinProb: number
  drawProb: number
  awayWinProb: number
  predictedHomeScore: number
  predictedAwayScore: number
  confidence: number
  explanation: string
  keyFactors: string[]
  modelVersion: string
  createdAt: string
}

export interface MatchInfo {
  homeTeam: string
  awayTeam: string
  league: string
  competitionType?: string
  round?: string
  homeTeamId?: number
  awayTeamId?: number
  homeForm?: string[]
  awayForm?: string[]
  homePosition?: number
  awayPosition?: number
  h2hResults?: string[]
  homeStats?: {
    wins: number
    draws: number
    losses: number
    goalsFor: number
    goalsAgainst: number
  }
  awayStats?: {
    wins: number
    draws: number
    losses: number
    goalsFor: number
    goalsAgainst: number
  }
  matchStatus?: string
  minute?: number | null
  currentHomeScore?: number | null
  currentAwayScore?: number | null
}

export type PredictionFailure =
  | { kind: 'unauthenticated' }
  | {
      kind: 'insufficient_credits'
      balance: number
      required: number
      modelId: string
    }
  | { kind: 'invalid_model'; modelId: string }
  | { kind: 'prediction_failed'; balance?: number; message?: string }
  | { kind: 'network'; message: string }

export class PredictionApiError extends Error {
  failure: PredictionFailure
  constructor(failure: PredictionFailure) {
    super(failure.kind)
    this.name = 'PredictionApiError'
    this.failure = failure
  }
}

const QUERY_KEY_BALANCE = ['credits', 'balance'] as const

export type PredictResult = {
  prediction: PredictionData
  balance?: number
  cached: boolean
}

/**
 * Fetch ML prediction (Poisson + XGBoost) — auth required, debits 2 credits.
 */
export async function fetchMLPrediction(
  body: Record<string, unknown>
): Promise<PredictResult> {
  const base = getApiBaseUrl()
  const res = await fetch(`${base}/api/predictions/ml`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}) as Record<string, unknown>)

  if (res.status === 401)
    throw new PredictionApiError({ kind: 'unauthenticated' })
  if (res.status === 402) {
    throw new PredictionApiError({
      kind: 'insufficient_credits',
      balance: Number(json.balance ?? 0),
      required: Number(json.required ?? 0),
      modelId: 'ml',
    })
  }
  if (!res.ok) {
    throw new PredictionApiError({
      kind: 'prediction_failed',
      balance:
        typeof json.balance === 'number' ? (json.balance as number) : undefined,
      message: typeof json.error === 'string' ? json.error : res.statusText,
    })
  }

  const data = (json as { data?: PredictionData }).data
  if (!data) {
    throw new PredictionApiError({
      kind: 'prediction_failed',
      message: 'malformed response',
    })
  }
  return {
    prediction: data,
    balance:
      typeof json.balance === 'number' ? (json.balance as number) : undefined,
    cached: false,
  }
}

/**
 * Fetch AI prediction. Auth required; debits per-model creditCost.
 */
export async function fetchAIPrediction(args: {
  fixtureId: number
  modelId: string
  match: MatchInfo
}): Promise<PredictResult> {
  const { fixtureId, modelId, match } = args
  const res = await fetch('/api/predict', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fixtureId,
      modelId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      match: {
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        league: match.league,
        competitionType: match.competitionType,
        round: match.round,
        homeForm: match.homeForm,
        awayForm: match.awayForm,
        homePosition: match.homePosition,
        awayPosition: match.awayPosition,
        h2hResults: match.h2hResults,
        homeStats: match.homeStats,
        awayStats: match.awayStats,
        matchStatus: match.matchStatus,
        minute: match.minute,
        currentHomeScore: match.currentHomeScore,
        currentAwayScore: match.currentAwayScore,
      },
    }),
  })

  const json = await res.json().catch(() => ({}) as Record<string, unknown>)

  if (res.status === 401)
    throw new PredictionApiError({ kind: 'unauthenticated' })
  if (res.status === 402) {
    throw new PredictionApiError({
      kind: 'insufficient_credits',
      balance: Number(json.balance ?? 0),
      required: Number(json.required ?? 0),
      modelId: String(json.modelId ?? modelId),
    })
  }
  if (res.status === 400 && json.error === 'invalid_model') {
    throw new PredictionApiError({
      kind: 'invalid_model',
      modelId: String(json.modelId ?? modelId),
    })
  }
  if (!res.ok) {
    throw new PredictionApiError({
      kind: 'prediction_failed',
      balance:
        typeof json.balance === 'number' ? (json.balance as number) : undefined,
      message: typeof json.error === 'string' ? json.error : res.statusText,
    })
  }

  const p = (json as any).prediction
  if (!p) {
    throw new PredictionApiError({
      kind: 'prediction_failed',
      message: 'malformed response',
    })
  }

  // Server returns probabilities as 0-1; UI consumes 0-100.
  return {
    prediction: {
      id: `ai-${fixtureId}`,
      fixtureId,
      homeWinProb: Math.round(p.homeWinProb * 100),
      drawProb: Math.round(p.drawProb * 100),
      awayWinProb: Math.round(p.awayWinProb * 100),
      predictedHomeScore: p.predictedHomeScore,
      predictedAwayScore: p.predictedAwayScore,
      confidence: Math.round(p.confidence * 100),
      explanation: p.analysis || '',
      keyFactors: p.keyFactors || [],
      modelVersion: p.model || 'unknown',
      createdAt: new Date().toISOString(),
    },
    balance:
      typeof json.balance === 'number' ? (json.balance as number) : undefined,
    cached: !!json.cached,
  }
}

/**
 * AI prediction is now manually triggered (credit-paid). Returns a mutation
 * the match page can call after the user picks a model.
 */
export function useAIPrediction() {
  const qc = useQueryClient()
  return useMutation<
    PredictResult,
    PredictionApiError,
    { fixtureId: number; modelId: string; match: MatchInfo }
  >({
    mutationFn: fetchAIPrediction,
    onSuccess: (result) => {
      if (typeof result.balance === 'number') {
        qc.setQueryData(QUERY_KEY_BALANCE, result.balance)
      } else {
        qc.invalidateQueries({ queryKey: QUERY_KEY_BALANCE })
      }
    },
    onError: (err) => {
      if (
        err.failure.kind === 'insufficient_credits' ||
        err.failure.kind === 'prediction_failed'
      ) {
        const balance = (err.failure as { balance?: number }).balance
        if (typeof balance === 'number') {
          qc.setQueryData(QUERY_KEY_BALANCE, balance)
        }
      }
    },
  })
}

/** Hook: ML model info — public/read-only metadata, no debit. */
export function useModelInfo() {
  return useQuery({
    queryKey: ['prediction', 'model-info'],
    queryFn: async () => {
      const base = getApiBaseUrl()
      const res = await fetchWithRetry<{
        success: boolean
        data: Record<string, unknown>
      }>(`${base}/api/predictions/model/info`)
      return res.data
    },
    staleTime: 1000 * 60 * 5,
  })
}
