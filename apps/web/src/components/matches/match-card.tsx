'use client'

import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'
import Image from 'next/image'

interface MatchCardProps {
  match: {
    id: number
    homeTeam: string
    awayTeam: string
    homeTeamLogo?: string | null
    awayTeamLogo?: string | null
    league: string
    time: string
    status: 'upcoming' | 'live' | 'finished'
    minute?: number
    homeScore?: number
    awayScore?: number
  }
  prediction?: {
    homeWin: number
    draw: number
    awayWin: number
    score: string
    confidence: number
  }
}

function TeamLogo({ src, name }: { src?: string | null; name: string }) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={40}
        height={40}
        className="rounded-lg"
      />
    )
  }
  // Fallback to first letter
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
      <span className="text-lg font-bold text-primary">{name.charAt(0)}</span>
    </div>
  )
}

export function MatchCard({ match, prediction }: MatchCardProps) {
  const isLive = match.status === 'live'
  const isFinished = match.status === 'finished'

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border border-border bg-card p-4 transition-all hover:shadow-lg',
        'cursor-pointer hover:scale-[1.02]',
        isLive && 'border-destructive/50'
      )}
    >
      {/* Status indicator */}
      {isLive && (
        <div className="absolute right-2 top-2">
          <span className="flex items-center gap-1 rounded-full bg-destructive/20 px-2 py-1 text-xs font-medium text-destructive">
            <span className="h-2 w-2 animate-pulse-slow rounded-full bg-destructive" />
            {match.minute ? `${match.minute}'` : 'LIVE'}
          </span>
        </div>
      )}

      {isFinished && (
        <div className="absolute right-2 top-2">
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            Bitti
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
          <TeamLogo src={match.homeTeamLogo} name={match.homeTeam} />
          <span className="font-semibold">{match.homeTeam}</span>
        </div>

        {/* Score or VS */}
        {(isLive || isFinished) && match.homeScore !== undefined ? (
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1">
            <span className="text-lg font-bold">{match.homeScore}</span>
            <span className="text-muted-foreground">-</span>
            <span className="text-lg font-bold">{match.awayScore}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">vs</span>
        )}

        <div className="flex items-center gap-3">
          <span className="font-semibold">{match.awayTeam}</span>
          <TeamLogo src={match.awayTeamLogo} name={match.awayTeam} />
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
            <div className="flex items-center gap-2">
              <span className="font-medium">{prediction.score}</span>
              <span className="text-muted-foreground">tahmini skor</span>
            </div>
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
