'use client'

import { useAllFixtures } from '@/hooks/use-fixtures'
import { MatchCard } from './match-card'
import { Fixture } from '@/lib/api'
import { Calendar, RefreshCw } from 'lucide-react'

function mapFixtureToMatchCard(fixture: Fixture) {
  const prediction = fixture.predictions?.[0]

  return {
    id: String(fixture.id),
    homeTeam: {
      id: String(fixture.homeTeam.id),
      name: fixture.homeTeam.name,
      shortName: fixture.homeTeam.code,
      crest: fixture.homeTeam.logoUrl,
    },
    awayTeam: {
      id: String(fixture.awayTeam.id),
      name: fixture.awayTeam.name,
      shortName: fixture.awayTeam.code,
      crest: fixture.awayTeam.logoUrl,
    },
    status: (fixture.status === 'LIVE' || fixture.status === 'HALFTIME'
      ? 'LIVE'
      : fixture.status === 'FINISHED'
        ? 'FINISHED'
        : 'SCHEDULED') as 'SCHEDULED' | 'LIVE' | 'FINISHED',
    matchDate: fixture.matchDate,
    score: fixture.homeScore !== undefined && fixture.awayScore !== undefined
      ? { home: fixture.homeScore, away: fixture.awayScore }
      : undefined,
    minute: fixture.minute,
    prediction: prediction ? {
      homeWinProb: prediction.homeWinProb,
      drawProb: prediction.drawProb,
      awayWinProb: prediction.awayWinProb,
      confidence: prediction.confidence,
    } : undefined,
    competition: {
      name: fixture.league.name,
      logo: fixture.league.logoUrl || undefined,
    },
  }
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="h-48 glass-card rounded-2xl overflow-hidden"
        >
          <div className="h-full shimmer" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="glass-card rounded-2xl p-12 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
          <Calendar className="w-8 h-8 text-muted-foreground" />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-2">Henüz maç verisi yok</h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto">
        Match service çalıştırıldığında maç verileri burada görünecek.
        API bağlantısını kontrol edin.
      </p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="glass-card rounded-2xl p-12 text-center border-destructive/20">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-3xl">⚠️</span>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-destructive mb-2">
        Veri yüklenirken hata oluştu
      </h3>
      <p className="text-muted-foreground text-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Tekrar Dene
        </button>
      )}
    </div>
  )
}

interface MatchListProps {
  filter?: 'all' | 'live' | 'upcoming' | 'finished'
  limit?: number
}

export function MatchList({ filter = 'all', limit }: MatchListProps) {
  const { data: fixtures, isLoading, isError, error, refetch } = useAllFixtures()

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (isError) {
    return <ErrorState message={error?.message || 'Bilinmeyen hata'} onRetry={() => refetch()} />
  }

  if (!fixtures || fixtures.length === 0) {
    return <EmptyState />
  }

  let filteredFixtures = fixtures

  // Apply filter
  if (filter !== 'all') {
    filteredFixtures = fixtures.filter((f) => {
      if (filter === 'live') return f.status === 'LIVE' || f.status === 'HALFTIME'
      if (filter === 'upcoming') return f.status === 'SCHEDULED'
      if (filter === 'finished') return f.status === 'FINISHED'
      return true
    })
  }

  // Apply limit
  if (limit) {
    filteredFixtures = filteredFixtures.slice(0, limit)
  }

  const matches = filteredFixtures.map(mapFixtureToMatchCard)

  if (matches.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-muted-foreground">
          {filter === 'live' && 'Şu anda canlı maç yok'}
          {filter === 'upcoming' && 'Yaklaşan maç bulunmuyor'}
          {filter === 'finished' && 'Tamamlanan maç bulunmuyor'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {matches.map((match) => (
        <MatchCard key={match.id} {...match} />
      ))}
    </div>
  )
}
