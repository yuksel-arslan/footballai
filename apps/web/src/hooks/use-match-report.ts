'use client'

import { useQuery } from '@tanstack/react-query'

export interface FormEntry {
  result: 'W' | 'D' | 'L'
  opponent: string
  score: string
  date: string
}

export interface TeamStatsBlock {
  played: number
  wins: number
  draws: number
  losses: number
  gfAvg: number
  gaAvg: number
  over25Rate: number
  bttsRate: number
  cleanSheets: number
  streak: string
}

export interface TimelineEvent {
  minute: number
  type: 'goal' | 'own_goal' | 'penalty' | 'yellow' | 'red' | 'sub'
  team: 'home' | 'away'
  player: string
  detail?: string
}

export interface MatchReportData {
  v?: number
  homeScore: number
  awayScore: number
  outcome: 'home' | 'draw' | 'away'
  home: string
  away: string
  league: string
  matchDate: string
  prediction: {
    existed: boolean
    pick?: 'home' | 'draw' | 'away'
    pickLabel?: string
    correct?: boolean
    probOnActual?: number
    predictedScore?: string
    confidence?: number
    probs?: { home: number; draw: number; away: number }
  }
  surprise?: 'major' | 'mild' | null
  preForm?: { home: FormEntry[]; away: FormEntry[] }
  h2h?: { homeWins: number; draws: number; awayWins: number; total: number }
  valueBet?: {
    pickLabel: string
    selection: 'home' | 'draw' | 'away'
    odds: number
    won: boolean
    profitUnits: number
  }
  stats?: { home: TeamStatsBlock; away: TeamStatsBlock }
  timeline?: TimelineEvent[]
  discipline?: {
    homeYellow: number
    homeRed: number
    awayYellow: number
    awayRed: number
  }
  takeaways: string[]
}

export interface MatchReport {
  id: number
  fixtureId: number
  summary: string
  data: MatchReportData
  createdAt: string
}

/** Post-match report for a finished fixture (auto-generated server-side). */
export function useMatchReport(fixtureId: number, enabled: boolean) {
  return useQuery<MatchReport | null>({
    queryKey: ['match-report', fixtureId],
    enabled: enabled && Number.isFinite(fixtureId),
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/matches/${fixtureId}/report`)
      if (res.status === 404) return null
      if (!res.ok) throw new Error('report_failed')
      const json = (await res.json()) as { data?: MatchReport }
      return json.data ?? null
    },
  })
}
