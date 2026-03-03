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

interface AIPredictionResponse {
  success: boolean
  data: PredictionData
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
 * Fetch AI prediction (Gemini) — requires auth token
 */
async function fetchAIPrediction(
  fixtureId: number,
  token?: string
): Promise<PredictionData> {
  const base = getApiBaseUrl()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetchWithRetry<AIPredictionResponse>(
    `${base}/api/predictions/${fixtureId}`,
    { headers }
  )
  return res.data
}

/**
 * Hook: AI prediction for a fixture (Gemini, auth required)
 */
export function useAIPrediction(fixtureId: number, token?: string) {
  return useQuery({
    queryKey: ['prediction', 'ai', fixtureId],
    queryFn: () => fetchAIPrediction(fixtureId, token),
    enabled: !!fixtureId && !!token && env.enablePredictions,
    staleTime: 1000 * 60 * 30, // 30 min
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
