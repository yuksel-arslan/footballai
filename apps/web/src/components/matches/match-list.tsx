'use client'

import { useAllFixtures } from '@/hooks/use-fixtures'
import { MatchCard } from './match-card'
import { Fixture } from '@/lib/api'

function mapFixtureToMatch(fixture: Fixture) {
  const prediction = fixture.predictions?.[0]

  return {
    id: fixture.id,
    homeTeam: fixture.homeTeam.name,
    awayTeam: fixture.awayTeam.name,
    homeTeamLogo: fixture.homeTeam.logoUrl,
    awayTeamLogo: fixture.awayTeam.logoUrl,
    league: fixture.league.name,
    time: new Date(fixture.matchDate).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    status: fixture.status === 'LIVE' || fixture.status === 'HALFTIME'
      ? 'live' as const
      : fixture.status === 'FINISHED'
        ? 'finished' as const
        : 'upcoming' as const,
    score: fixture.homeScore !== undefined && fixture.awayScore !== undefined
      ? `${fixture.homeScore}-${fixture.awayScore}`
      : undefined,
    minute: fixture.minute,
    prediction: prediction ? {
      homeWin: prediction.homeWinProb,
      draw: prediction.drawProb,
      awayWin: prediction.awayWinProb,
      score: prediction.predictedHomeScore !== undefined && prediction.predictedAwayScore !== undefined
        ? `${prediction.predictedHomeScore}-${prediction.predictedAwayScore}`
        : undefined,
      confidence: prediction.confidence,
    } : undefined,
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-32 bg-card animate-pulse rounded-lg border border-border"
        />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p className="text-lg">Henüz maç verisi yok</p>
      <p className="text-sm mt-2">
        Match service çalıştırıldığında veriler burada görünecek
      </p>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-destructive">Veri yüklenirken hata oluştu</p>
      <p className="text-sm text-muted-foreground mt-2">{message}</p>
    </div>
  )
}

export function MatchList() {
  const { data: fixtures, isLoading, isError, error } = useAllFixtures()

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (isError) {
    return <ErrorState message={error?.message || 'Bilinmeyen hata'} />
  }

  if (!fixtures || fixtures.length === 0) {
    return <EmptyState />
  }

  const matches = fixtures.map(mapFixtureToMatch)

  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          prediction={match.prediction}
        />
      ))}
    </div>
  )
}
