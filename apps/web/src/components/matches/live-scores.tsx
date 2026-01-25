'use client'

import { Zap, ChevronRight, Key } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useLiveFixtures } from '@/hooks/use-fixtures'
import { Fixture, ApiConfigError } from '@/lib/api'

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

function mapFixtureToLiveMatch(fixture: Fixture): LiveMatch {
  return {
    id: String(fixture.id),
    homeTeam: {
      name: fixture.homeTeam.name,
      shortName: fixture.homeTeam.code,
      crest: fixture.homeTeam.logoUrl,
      score: fixture.homeScore ?? 0,
    },
    awayTeam: {
      name: fixture.awayTeam.name,
      shortName: fixture.awayTeam.code,
      crest: fixture.awayTeam.logoUrl,
      score: fixture.awayScore ?? 0,
    },
    minute: fixture.minute ?? 0,
    competition: fixture.league.name,
  }
}

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
  const { data: fixtures, isLoading, isError, error } = useLiveFixtures()

  const liveMatches = (fixtures || []).map(mapFixtureToLiveMatch)

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

  // Check for API config error
  if (isError && (error instanceof ApiConfigError || error?.message?.includes('API anahtarı'))) {
    return (
      <div className="glass-card rounded-2xl p-4 border border-[#FBBF24]/30 bg-[#FBBF24]/5">
        <div className="flex items-center gap-2 mb-3">
          <Key className="w-5 h-5 text-[#FBBF24]" />
          <h3 className="font-semibold text-[#FBBF24]">API Gerekli</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Canlı maçları görmek için API anahtarı ekleyin.{' '}
          <a
            href="https://www.football-data.org/client/register"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0EA5E9] hover:underline"
          >
            Ücretsiz key al
          </a>
        </p>
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
