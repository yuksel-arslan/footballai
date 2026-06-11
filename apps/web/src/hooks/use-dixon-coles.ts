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
  /** Where the 1X2 odds came from. 'ai' = estimated (no market posted yet). */
  oddsSource?: 'manual' | 'market' | 'ai'
  /** Set when the analysis was conditioned on an in-play state. */
  live?: { minute: number; home_goals: number; away_goals: number } | null
}

export class DixonColesError extends Error {
  code: string
  status: number
  balance?: number
  required?: number
  detail?: string

  constructor(
    code: string,
    status: number,
    opts: { balance?: number; required?: number; detail?: string } = {}
  ) {
    super(code)
    this.name = 'DixonColesError'
    this.code = code
    this.status = status
    this.balance = opts.balance
    this.required = opts.required
    this.detail = opts.detail
  }
}

interface AnalyzeInput {
  fixtureId: number
  // Team names let the backend cross-check the fixture row (provider ids can
  // collide) and fall back to name-based history when the id is unknown.
  home?: string
  away?: string
  // Omit to let the backend auto-fetch odds from API-Football.
  odds?: { home: number; draw: number; away: number }
  // In-play state as the client sees it (live pages have fresher data than
  // the DB row); the analysis is then conditioned on score + minute.
  live?: { minute: number; homeGoals: number; awayGoals: number }
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
    mutationFn: async ({ fixtureId, home, away, odds, live }) => {
      const res = await fetch('/api/predictions/dixon-coles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixtureId,
          ...(home && away ? { home, away } : {}),
          ...(odds ? { odds } : {}),
          ...(live ? { live } : {}),
        }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean
        data?: DixonColesResult
        balance?: number
        error?: unknown
        detail?: unknown
        required?: number
      }

      if (!res.ok || !json.success || !json.data) {
        // error may be a string code or a structured object (upstream
        // validation errors) — normalize so the UI never shows
        // "[object Object]" and the real cause is visible.
        const raw = json.error ?? json.detail ?? 'request_failed'
        const code =
          typeof raw === 'string' ? raw : JSON.stringify(raw).slice(0, 300)
        const detail =
          typeof json.detail === 'string'
            ? json.detail
            : json.detail != null
              ? JSON.stringify(json.detail).slice(0, 300)
              : undefined
        throw new DixonColesError(code, res.status, {
          balance: json.balance,
          required: json.required,
          detail,
        })
      }
      return { result: json.data, balance: json.balance }
    },
    onSuccess: () => {
      invalidateCredits()
    },
  })
}
