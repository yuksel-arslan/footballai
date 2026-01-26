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
      <div className="group relative bg-card rounded-xl border border-border/50 p-3 card-hover overflow-hidden">
        {/* Background Gradient on Hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Header - Competition & Status */}
        <div className="relative flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {competition?.logo && (
              <Image
                src={competition.logo}
                alt={competition.name}
                width={14}
                height={14}
                className="rounded shrink-0"
              />
            )}
            <span className="text-[10px] text-muted-foreground font-medium truncate">
              {competition?.name || 'League'}
            </span>
          </div>

          {isLive ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full status-live shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 live-pulse" />
              <span className="text-[10px] font-semibold">{minute}&apos;</span>
            </div>
          ) : isFinished ? (
            <div className="px-2 py-0.5 rounded-full status-finished shrink-0">
              <span className="text-[10px] font-medium">Bitti</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full status-scheduled shrink-0">
              <Clock className="w-3 h-3" />
              <span className="text-[10px] font-medium">{matchTime}</span>
            </div>
          )}
        </div>

        {/* Teams & Score */}
        <div className="relative flex items-center justify-between gap-2">
          {/* Home Team */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
              {homeTeam.crest ? (
                <Image
                  src={homeTeam.crest}
                  alt={homeTeam.name}
                  width={32}
                  height={32}
                  className="object-contain"
                />
              ) : (
                <span className="text-base font-bold text-muted-foreground">
                  {homeTeam.shortName?.charAt(0) || homeTeam.name.charAt(0)}
                </span>
              )}
            </div>
            <p className={`font-semibold text-sm truncate ${getWinnerClass('home')}`} title={homeTeam.name}>
              {homeTeam.shortName || homeTeam.name.split(' ')[0]}
            </p>
          </div>

          {/* Score */}
          <div className="flex items-center gap-1.5 px-2 shrink-0">
            {isLive || isFinished ? (
              <>
                <span className={`text-2xl font-bold tabular-nums ${getWinnerClass('home')}`}>
                  {score?.home ?? 0}
                </span>
                <span className="text-lg text-muted-foreground">-</span>
                <span className={`text-2xl font-bold tabular-nums ${getWinnerClass('away')}`}>
                  {score?.away ?? 0}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold text-muted-foreground">VS</span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
            <p className={`font-semibold text-sm truncate text-right ${getWinnerClass('away')}`} title={awayTeam.name}>
              {awayTeam.shortName || awayTeam.name.split(' ')[0]}
            </p>
            <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
              {awayTeam.crest ? (
                <Image
                  src={awayTeam.crest}
                  alt={awayTeam.name}
                  width={32}
                  height={32}
                  className="object-contain"
                />
              ) : (
                <span className="text-base font-bold text-muted-foreground">
                  {awayTeam.shortName?.charAt(0) || awayTeam.name.charAt(0)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Prediction Bar */}
        {prediction && !isFinished && (
          <div className="relative mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-medium text-muted-foreground">AI Tahmini</span>
              </div>
              <span className="text-[10px] font-semibold text-primary">
                %{Math.round(prediction.confidence * 100)} güven
              </span>
            </div>

            <div className="flex h-1.5 rounded-full overflow-hidden bg-muted/50">
              <div
                className="bg-green-500 transition-all duration-500"
                style={{ width: `${prediction.homeWinProb * 100}%` }}
              />
              <div
                className="bg-yellow-500 transition-all duration-500"
                style={{ width: `${prediction.drawProb * 100}%` }}
              />
              <div
                className="bg-red-500 transition-all duration-500"
                style={{ width: `${prediction.awayWinProb * 100}%` }}
              />
            </div>

            <div className="flex justify-between mt-1 text-[10px] font-medium">
              <span className="text-green-500">%{Math.round(prediction.homeWinProb * 100)}</span>
              <span className="text-yellow-500">%{Math.round(prediction.drawProb * 100)}</span>
              <span className="text-red-500">%{Math.round(prediction.awayWinProb * 100)}</span>
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
