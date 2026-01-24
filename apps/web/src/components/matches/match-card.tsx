'use client'

import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'

interface MatchCardProps {
  match: {
    id: number
    homeTeam: string
    awayTeam: string
    league: string
    time: string
    status: 'upcoming' | 'live' | 'finished'
  }
  prediction?: {
    homeWin: number
    draw: number
    awayWin: number
    score?: string
    confidence: number
  }
}

export function MatchCard({ match, prediction }: MatchCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border border-border bg-card p-4 transition-all hover:shadow-lg',
        'cursor-pointer hover:scale-[1.02]'
      )}
    >
      {/* Status indicator */}
      {match.status === 'live' && (
        <div className="absolute right-2 top-2">
          <span className="flex items-center gap-1 rounded-full bg-destructive/20 px-2 py-1 text-xs font-medium text-destructive">
            <span className="h-2 w-2 animate-pulse-slow rounded-full bg-destructive" />
            LIVE
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{match.time}</span>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {match.league}
        </span>
      </div>

      {/* Teams */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <span className="text-xl">🏴󠁧󠁢󠁥󠁮󠁧󠁿</span>
          </div>
          <span className="font-semibold">{match.homeTeam}</span>
        </div>

        <span className="text-xs text-muted-foreground">vs</span>

        <div className="flex items-center gap-3">
          <span className="font-semibold">{match.awayTeam}</span>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <span className="text-xl">🏴󠁧󠁢󠁥󠁮󠁧󠁿</span>
          </div>
        </div>
      </div>

      {/* Prediction */}
      {prediction && (
        <div className="space-y-2">
          {/* Probability Bar */}
          <div className="flex h-2 overflow-hidden rounded-full">
            <div
              className="bg-win"
              style={{ width: `${prediction.homeWin}%` }}
            />
            <div className="bg-draw" style={{ width: `${prediction.draw}%` }} />
            <div
              className="bg-loss"
              style={{ width: `${prediction.awayWin}%` }}
            />
          </div>

          {/* Details */}
          <div className="flex items-center justify-between text-sm">
            {prediction.score && (
              <div className="flex items-center gap-2">
                <span className="font-medium">{prediction.score}</span>
                <span className="text-muted-foreground">tahmini skor</span>
              </div>
            )}
            <span
              className={cn(
                'rounded-full px-2 py-1 text-xs font-medium',
                prediction.confidence > 70
                  ? 'bg-win/20 text-win'
                  : prediction.confidence > 50
                    ? 'bg-draw/20 text-draw'
                    : 'bg-loss/20 text-loss'
              )}
            >
              🎯 {prediction.confidence}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
