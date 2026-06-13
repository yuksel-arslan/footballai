'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormEntry, TeamStatsBlock } from '@/hooks/use-match-report'

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

export interface PreReport {
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
    h2h: { homeWins: number; draws: number; awayWins: number; total: number }
  }
  inPlay?: { summary: string; minute: number; score: string } | null
  generatedAt: string
}

export interface PreReportStatus {
  available: boolean
  paid: boolean
  finished: boolean
  live: boolean
  hasPrediction: boolean
  cost: number
}

export type PreReportFailure =
  | { kind: 'unauthenticated' }
  | { kind: 'insufficient_credits'; balance: number; required: number }
  | { kind: 'not_found' }
  | { kind: 'failed'; message?: string }

export class PreReportError extends Error {
  failure: PreReportFailure
  constructor(failure: PreReportFailure) {
    super(failure.kind)
    this.name = 'PreReportError'
    this.failure = failure
  }
}

const QUERY_KEY_BALANCE = ['credits', 'balance'] as const

/** Status: pre-match report availability + whether THIS viewer already paid. */
export function usePreReportStatus(fixtureId: number, enabled = true) {
  return useQuery<PreReportStatus | null>({
    queryKey: ['pre-report-status', fixtureId],
    enabled: enabled && Number.isFinite(fixtureId),
    staleTime: 30 * 1000,
    queryFn: async () => {
      const res = await fetch(
        `/api/reports/pre/status?fixtureId=${fixtureId}`,
        {
          credentials: 'include',
        }
      )
      const json = await res.json().catch(() => null)
      return json?.data ?? null
    },
  })
}

/**
 * Unlock + load the pre-match ("Önce") report. Debits 6 credits the first time
 * per fixture; re-views (and viewers who already paid) come back `cached` with
 * no charge.
 */
export function usePreReport() {
  const qc = useQueryClient()
  return useMutation<
    { report: PreReport; cached: boolean; balance?: number },
    PreReportError,
    { fixtureId: number }
  >({
    mutationFn: async ({ fixtureId }) => {
      const res = await fetch('/api/reports/pre', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtureId }),
      })
      const json = await res.json().catch(() => ({}) as Record<string, unknown>)

      if (res.status === 401)
        throw new PreReportError({ kind: 'unauthenticated' })
      if (res.status === 402)
        throw new PreReportError({
          kind: 'insufficient_credits',
          balance: Number(json.balance ?? 0),
          required: Number(json.required ?? 0),
        })
      if (res.status === 404) throw new PreReportError({ kind: 'not_found' })
      if (!res.ok)
        throw new PreReportError({
          kind: 'failed',
          message: typeof json.error === 'string' ? json.error : res.statusText,
        })

      const report = (json as { data?: PreReport }).data
      if (!report) throw new PreReportError({ kind: 'failed' })
      return {
        report,
        cached: !!(json as { cached?: boolean }).cached,
        balance:
          typeof json.balance === 'number'
            ? (json.balance as number)
            : undefined,
      }
    },
    onSuccess: (result) => {
      if (typeof result.balance === 'number') {
        qc.setQueryData(QUERY_KEY_BALANCE, result.balance)
      }
      qc.invalidateQueries({
        queryKey: ['pre-report-status', result.report.fixtureId],
      })
    },
    onError: (err) => {
      if (err.failure.kind === 'insufficient_credits') {
        qc.setQueryData(QUERY_KEY_BALANCE, err.failure.balance)
      }
    },
  })
}
