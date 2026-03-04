'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface UserPrediction {
  id: number
  userId: string
  predictionId: number
  predictedResult: string
  actualResult: string | null
  wasCorrect: boolean | null
  createdAt: string
  prediction: {
    fixtureId: number
    homeWinProb: number
    drawProb: number
    awayWinProb: number
    confidence: number
    fixture: {
      id: number
      matchDate: string
      status: string
      homeScore: number | null
      awayScore: number | null
      homeTeam: { id: number; name: string; logoUrl: string | null }
      awayTeam: { id: number; name: string; logoUrl: string | null }
      league: { id: number; name: string; logoUrl: string | null }
    }
  }
}

interface PredictionStats {
  total: number
  correct: number
  accuracy: number
}

interface CreatePredictionInput {
  fixtureId: number
  predictedResult: 'home' | 'draw' | 'away'
  predictedHomeScore?: number
  predictedAwayScore?: number
}

async function fetchUserPredictions(page = 1): Promise<{ data: UserPrediction[]; pagination: any }> {
  const res = await fetch(`/api/profile/predictions?page=${page}`)
  if (!res.ok) throw new Error('Failed to fetch predictions')
  return res.json()
}

async function fetchPredictionStats(): Promise<PredictionStats> {
  const res = await fetch('/api/profile/predictions/stats')
  if (!res.ok) throw new Error('Failed to fetch stats')
  const data = await res.json()
  return data.data || data
}

async function createPrediction(input: CreatePredictionInput): Promise<UserPrediction> {
  const res = await fetch('/api/profile/predictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to create prediction')
  }
  const data = await res.json()
  return data.data || data
}

async function deletePrediction(id: number): Promise<void> {
  const res = await fetch(`/api/profile/predictions/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete prediction')
}

export function useUserPredictions(page = 1) {
  return useQuery({
    queryKey: ['user-predictions', page],
    queryFn: () => fetchUserPredictions(page),
    staleTime: 1000 * 60 * 2,
  })
}

export function useUserPredictionStats() {
  return useQuery<PredictionStats>({
    queryKey: ['user-prediction-stats'],
    queryFn: fetchPredictionStats,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreatePrediction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPrediction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-predictions'] })
      queryClient.invalidateQueries({ queryKey: ['user-prediction-stats'] })
    },
  })
}

export function useDeletePrediction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deletePrediction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-predictions'] })
      queryClient.invalidateQueries({ queryKey: ['user-prediction-stats'] })
    },
  })
}

// ============================================
// PREDICTION COMPARISON
// ============================================

interface PredictionComparison {
  fixture: {
    id: number
    status: string
    homeScore: number | null
    awayScore: number | null
    homeTeam: { id: number; name: string; logoUrl: string | null }
    awayTeam: { id: number; name: string; logoUrl: string | null }
    league: { id: number; name: string }
    matchDate: string
  }
  aiPrediction: {
    predictedResult: string | null
    predictedHomeScore: number
    predictedAwayScore: number
    homeWinProb: number
    drawProb: number
    awayWinProb: number
    confidence: number
    wasCorrect: boolean | null
    scoreCorrect: boolean | null
  } | null
  userPrediction: {
    predictedResult: string
    predictedHomeScore: number | null
    predictedAwayScore: number | null
    wasCorrect: boolean | null
    scoreCorrect: boolean | null
  } | null
  actualResult: string | null
}

async function fetchComparison(fixtureId: number): Promise<PredictionComparison> {
  const res = await fetch(`/api/predictions/compare?fixtureId=${fixtureId}`)
  if (!res.ok) throw new Error('Failed to fetch comparison')
  const data = await res.json()
  return data.data
}

export function usePredictionComparison(fixtureId: number) {
  return useQuery({
    queryKey: ['prediction-comparison', fixtureId],
    queryFn: () => fetchComparison(fixtureId),
    enabled: !!fixtureId,
    staleTime: 1000 * 60 * 5,
  })
}

interface AIAccuracyStats {
  totalPredictions: number
  correctPredictions: number
  scoreCorrectPredictions: number
  accuracy: number
}

async function fetchAIStats(): Promise<AIAccuracyStats> {
  const res = await fetch('/api/predictions/ai-stats')
  if (!res.ok) throw new Error('Failed to fetch AI stats')
  const data = await res.json()
  return data.data
}

export function useAIAccuracyStats() {
  return useQuery<AIAccuracyStats>({
    queryKey: ['ai-accuracy-stats'],
    queryFn: fetchAIStats,
    staleTime: 1000 * 60 * 10,
  })
}
