'use client'

import { useState, useEffect } from 'react'
import { Zap, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface LiveMatch {
  id: string
  homeTeam: {
    name: string
    shortName?: string
    crest?: string
    score: number
  }
  awayTeam: {
    name: string
    shortName?: string
    crest?: string
    score: number
  }
  minute: number
  competition: string
}

// Mock data - will be replaced with real API data
const mockLiveMatches: LiveMatch[] = [
  {
    id: '1',
    homeTeam: { name: 'Manchester United', shortName: 'MUN', score: 2, crest: 'https://crests.football-data.org/66.png' },
    awayTeam: { name: 'Liverpool', shortName: 'LIV', score: 1, crest: 'https://crests.football-data.org/64.png' },
    minute: 67,
    competition: 'Premier League',
  },
  {
    id: '2',
    homeTeam: { name: 'Real Madrid', shortName: 'RMA', score: 0, crest: 'https://crests.football-data.org/86.png' },
    awayTeam: { name: 'Barcelona', shortName: 'BAR', score: 0, crest: 'https://crests.football-data.org/81.png' },
    minute: 23,
    competition: 'La Liga',
  },
]

function LiveMatchItem({ match }: { match: LiveMatch }) {
  return (
    <Link href={`/match/${match.id}`} className="block">
      <div className="group flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors">
        {/* Home Team */}
        <div className="flex-1 flex items-center gap-2">
          {match.homeTeam.crest ? (
            <Image
              src={match.homeTeam.crest}
              alt={match.homeTeam.name}
              width={24}
              height={24}
              className="object-contain"
            />
          ) : (
            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs">
              {match.homeTeam.shortName?.charAt(0) || '?'}
            </div>
          )}
          <span className="font-medium text-sm truncate">
            {match.homeTeam.shortName || match.homeTeam.name}
          </span>
        </div>

        {/* Score */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/50">
          <span className="text-lg font-bold tabular-nums">{match.homeTeam.score}</span>
          <span className="text-muted-foreground">-</span>
          <span className="text-lg font-bold tabular-nums">{match.awayTeam.score}</span>
        </div>

        {/* Away Team */}
        <div className="flex-1 flex items-center gap-2 justify-end">
          <span className="font-medium text-sm truncate">
            {match.awayTeam.shortName || match.awayTeam.name}
          </span>
          {match.awayTeam.crest ? (
            <Image
              src={match.awayTeam.crest}
              alt={match.awayTeam.name}
              width={24}
              height={24}
              className="object-contain"
            />
          ) : (
            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs">
              {match.awayTeam.shortName?.charAt(0) || '?'}
            </div>
          )}
        </div>

        {/* Minute */}
        <div className="flex items-center gap-1.5 text-red-500">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 live-pulse" />
          <span className="text-xs font-semibold">{match.minute}&apos;</span>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  )
}

export function LiveScores() {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate API call - replace with real API integration
    const timer = setTimeout(() => {
      setLiveMatches(mockLiveMatches)
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold">Canlı Maçlar</h3>
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 rounded-xl shimmer" />
          ))}
        </div>
      </div>
    )
  }

  if (liveMatches.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Canlı Maçlar</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Şu anda canlı maç yok
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Zap className="w-5 h-5 text-red-500" />
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 live-pulse" />
          </div>
          <h3 className="font-semibold">Canlı Maçlar</h3>
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 text-xs font-medium">
            {liveMatches.length}
          </span>
        </div>
        <Link
          href="/live"
          className="text-xs text-primary hover:underline"
        >
          Tümünü Gör
        </Link>
      </div>

      <div className="space-y-1">
        {liveMatches.map((match) => (
          <LiveMatchItem key={match.id} match={match} />
        ))}
      </div>
    </div>
  )
}
