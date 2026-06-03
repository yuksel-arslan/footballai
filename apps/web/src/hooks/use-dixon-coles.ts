'use client'

import { useMutation } from '@tanstack/react-query'
import { useInvalidateCredits } from './use-credits'

export interface ValueBet {
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

export interface DixonColesResult {
  fixture: string
  probabilities: {
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
  value: ValueBet[] | null
  cached?: boolean
}

export class DixonColesError extends Error {
  code: string
  status: number
  balance?: number
  required?: number

  constructor(
    code: string,
    status: number,
    opts: { balance?: number; required?: number } = {}
  ) {
    super(code)
    this.name = 'DixonColesError'
    this.code = code
    this.status = status
    this.balance = opts.balance
    this.required = opts.required
  }
}

interface AnalyzeInput {
  fixtureId: number
  // Omit to let the backend auto-fetch odds from API-Football.
  odds?: { home: number; draw: number; away: number }
}

/**
 * Calls the premium Dixon-Coles + value-bet endpoint (credits are debited
 * server-side). Returns calibrated probabilities and value signals; invalidates
 * the credit balance on success so the header pill stays accurate.
 */
export function useDixonColes() {
  const invalidateCredits = useInvalidateCredits()

  return useMutation<
    { result: DixonColesResult; balance?: number },
    DixonColesError,
    AnalyzeInput
  >({
    mutationFn: async ({ fixtureId, odds }) => {
      const res = await fetch('/api/predictions/dixon-coles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(odds ? { fixtureId, odds } : { fixtureId }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean
        data?: DixonColesResult
        balance?: number
        error?: string
        required?: number
      }

      if (!res.ok || !json.success || !json.data) {
        throw new DixonColesError(json.error || 'request_failed', res.status, {
          balance: json.balance,
          required: json.required,
        })
      }
      return { result: json.data, balance: json.balance }
    },
    onSuccess: () => {
      invalidateCredits()
    },
  })
}
