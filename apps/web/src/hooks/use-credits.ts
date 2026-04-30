'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/use-auth'

const QUERY_KEY = ['credits', 'balance'] as const

async function fetchBalance(): Promise<number> {
  const res = await fetch('/api/credits/balance', {
    credentials: 'include',
  })
  if (!res.ok) {
    if (res.status === 401) return 0
    throw new Error(`balance fetch failed: ${res.status}`)
  }
  const data = (await res.json()) as { balance: number }
  return data.balance
}

/**
 * Fetches the authenticated user's credit balance. Refetches on window focus
 * and at a slow interval; the prediction mutations will also invalidate this
 * key after a successful debit so the pill stays accurate without a roundtrip.
 */
export function useCredits() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchBalance,
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  })
}

export function useInvalidateCredits() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: QUERY_KEY })
}

/** Optimistic balance update — used when a prediction response includes the
 * new balance, so the header pill updates instantly. */
export function useSetCreditsBalance() {
  const qc = useQueryClient()
  return (balance: number) => qc.setQueryData(QUERY_KEY, balance)
}
