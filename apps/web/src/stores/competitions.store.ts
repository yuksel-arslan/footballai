'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { LEAGUES } from '@/lib/reference-data'

const ALL_CODES = Object.keys(LEAGUES)

interface CompetitionsState {
  /** League codes the user follows. Empty = show everything (no filter). */
  selected: string[]
  toggle: (code: string) => void
  selectAll: () => void
  clear: () => void
}

/**
 * Per-user competition selection (persisted in the browser). The dashboard
 * selector writes here; pages read it to filter what they show. Default: all
 * curated competitions selected.
 */
export const useCompetitions = create<CompetitionsState>()(
  persist(
    (set) => ({
      selected: ALL_CODES,
      toggle: (code) =>
        set((s) => ({
          selected: s.selected.includes(code)
            ? s.selected.filter((c) => c !== code)
            : [...s.selected, code],
        })),
      selectAll: () => set({ selected: ALL_CODES }),
      clear: () => set({ selected: [] }),
    }),
    { name: 'footballai-competitions' }
  )
)
