'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import env, { getApiBaseUrl } from '@/lib/env'

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

interface MLPredictionResponse {
  success: boolean
  data: PredictionData
  source: string
}

export interface MatchInfo {
  homeTeam: string
  awayTeam: string
  league: string
  competitionType?: string // e.g. 'domestic_league', 'champions_league', etc.
  round?: string // e.g. 'Quarter-final', 'Matchday 28'
  homeTeamId?: number // Used for RAG (injuries, news)
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
  // Live match data
  matchStatus?: string // SCHEDULED, LIVE, HALFTIME, FINISHED
  minute?: number | null // Current match minute
  currentHomeScore?: number | null // Current live score
  currentAwayScore?: number | null
}

interface DirectPredictionResponse {
  prediction: {
    homeWinProb: number
    drawProb: number
    awayWinProb: number
    predictedHomeScore: number
    predictedAwayScore: number
    confidence: number
    analysis: string
    keyFactors: string[]
    model: string
  }
  cached: boolean
}

/**
 * Fetch ML prediction (Poisson + XGBoost) — public, no auth
 */
export async function fetchMLPrediction(
  body: Record<string, unknown>
): Promise<PredictionData> {
  const base = getApiBaseUrl()
  const res = await fetchWithRetry<MLPredictionResponse>(
    `${base}/api/predictions/ml`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  return res.data
}

/**
 * Fetch AI prediction directly via /api/predict (Gemini, no backend needed)
 */
async function fetchAIPrediction(
  fixtureId: number,
  match: MatchInfo
): Promise<PredictionData> {
  const res = await fetchWithRetry<DirectPredictionResponse>('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fixtureId,
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

  const p = res.prediction

  // Map response: gemini.ts returns probabilities as 0-1, UI expects 0-100
  return {
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
  }
}

/**
 * Hook: AI prediction for a fixture (direct Gemini call, no backend required)
 */
export function useAIPrediction(fixtureId: number, match?: MatchInfo) {
  const isLive =
    match?.matchStatus === 'LIVE' || match?.matchStatus === 'HALFTIME'
  return useQuery({
    // Include live score in query key so prediction refreshes when score changes
    queryKey: isLive
      ? [
          'prediction',
          'ai',
          fixtureId,
          'live',
          match?.currentHomeScore,
          match?.currentAwayScore,
          match?.minute,
        ]
      : ['prediction', 'ai', fixtureId],
    queryFn: () => fetchAIPrediction(fixtureId, match!),
    enabled: !!fixtureId && !!match && env.enablePredictions,
    staleTime: isLive ? 1000 * 60 * 5 : 1000 * 60 * 30, // 5 min for live, 30 min otherwise
    gcTime: 1000 * 60 * 60, // 1 hour
  })
}

/**
 * Hook: ML model info
 */
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
