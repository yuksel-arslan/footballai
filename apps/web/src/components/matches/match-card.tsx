'use client'

import { Clock, TrendingUp, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface Team {
  id: string
  name: string
  shortName?: string
  crest?: string
}

interface Prediction {
  homeWinProb: number
  drawProb: number
  awayWinProb: number
  confidence: number
}

interface MatchCardProps {
  id: string
  homeTeam: Team
  awayTeam: Team
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED'
  matchDate: string
  score?: {
    home: number | null
    away: number | null
  }
  minute?: number
  prediction?: Prediction
  competition?: {
    name: string
    logo?: string
  }
}

export function MatchCard({
  id,
  homeTeam,
  awayTeam,
  status,
  matchDate,
  score,
  minute,
  prediction,
  competition,
}: MatchCardProps) {
  const isLive = status === 'LIVE'
  const isFinished = status === 'FINISHED'
  const matchTime = new Date(matchDate).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const getWinnerClass = (team: 'home' | 'away') => {
    if (!isFinished || !score || score.home === null || score.away === null) return ''
    if (score.home === score.away) return ''
    if (team === 'home' && score.home > score.away) return 'text-green-500'
    if (team === 'away' && score.away > score.home) return 'text-green-500'
    return 'text-muted-foreground'
  }

  return (
    <Link href={`/match/${id}`} className="block">
      <div className="group relative bg-card rounded-2xl border border-border/50 p-4 card-hover overflow-hidden">
        {/* Background Gradient on Hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Header - Competition & Status */}
        <div className="relative flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {competition?.logo && (
              <Image
                src={competition.logo}
                alt={competition.name}
                width={16}
                height={16}
                className="rounded"
              />
            )}
            <span className="text-xs text-muted-foreground font-medium">
              {competition?.name || 'League'}
            </span>
          </div>

          {isLive ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full status-live">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 live-pulse" />
              <span className="text-xs font-semibold">{minute}&apos;</span>
            </div>
          ) : isFinished ? (
            <div className="px-2.5 py-1 rounded-full status-finished">
              <span className="text-xs font-medium">Bitti</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full status-scheduled">
              <Clock className="w-3 h-3" />
              <span className="text-xs font-medium">{matchTime}</span>
            </div>
          )}
        </div>

        {/* Teams & Score */}
        <div className="relative flex items-center justify-between gap-4">
          {/* Home Team */}
          <div className="flex-1 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden">
              {homeTeam.crest ? (
                <Image
                  src={homeTeam.crest}
                  alt={homeTeam.name}
                  width={36}
                  height={36}
                  className="object-contain"
                />
              ) : (
                <span className="text-lg">🏠</span>
              )}
            </div>
            <div className="min-w-0">
              <p className={`font-semibold truncate ${getWinnerClass('home')}`}>
                {homeTeam.shortName || homeTeam.name}
              </p>
              <p className="text-xs text-muted-foreground">Ev Sahibi</p>
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-2 px-4">
            {isLive || isFinished ? (
              <>
                <span className={`text-3xl font-bold tabular-nums ${getWinnerClass('home')}`}>
                  {score?.home ?? 0}
                </span>
                <span className="text-xl text-muted-foreground">-</span>
                <span className={`text-3xl font-bold tabular-nums ${getWinnerClass('away')}`}>
                  {score?.away ?? 0}
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">vs</span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 flex items-center gap-3 justify-end text-right">
            <div className="min-w-0">
              <p className={`font-semibold truncate ${getWinnerClass('away')}`}>
                {awayTeam.shortName || awayTeam.name}
              </p>
              <p className="text-xs text-muted-foreground">Deplasman</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden">
              {awayTeam.crest ? (
                <Image
                  src={awayTeam.crest}
                  alt={awayTeam.name}
                  width={36}
                  height={36}
                  className="object-contain"
                />
              ) : (
                <span className="text-lg">✈️</span>
              )}
            </div>
          </div>
        </div>

        {/* Prediction Bar */}
        {prediction && !isFinished && (
          <div className="relative mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">AI Tahmini</span>
              </div>
              <span className="text-xs font-semibold text-primary">
                %{Math.round(prediction.confidence)} güven
              </span>
            </div>

            <div className="flex h-2 rounded-full overflow-hidden bg-muted/50">
              <div
                className="bg-green-500 transition-all duration-500"
                style={{ width: `${prediction.homeWinProb}%` }}
              />
              <div
                className="bg-yellow-500 transition-all duration-500"
                style={{ width: `${prediction.drawProb}%` }}
              />
              <div
                className="bg-red-500 transition-all duration-500"
                style={{ width: `${prediction.awayWinProb}%` }}
              />
            </div>

            <div className="flex justify-between mt-1.5 text-[10px] font-medium">
              <span className="text-green-500">%{Math.round(prediction.homeWinProb)}</span>
              <span className="text-yellow-500">%{Math.round(prediction.drawProb)}</span>
              <span className="text-red-500">%{Math.round(prediction.awayWinProb)}</span>
            </div>
          </div>
        )}

        {/* View Details Arrow */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </Link>
  )
}
