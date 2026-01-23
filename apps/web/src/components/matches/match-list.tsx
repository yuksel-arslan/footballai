'use client'

import { useTodayMatches, useLiveMatches } from '@/hooks/useMatches'
import { MatchCard } from './match-card'
import { Loader2 } from 'lucide-react'

// Fallback mock data for when API is not available
const mockMatches = [
  {
    id: 1,
    homeTeam: { id: 33, name: 'Manchester United', logoUrl: null },
    awayTeam: { id: 34, name: 'Liverpool', logoUrl: null },
    league: { id: 39, name: 'Premier League', logoUrl: null },
    matchDate: new Date().toISOString(),
    status: 'SCHEDULED' as const,
    prediction: {
      homeWin: 45.2,
      draw: 28.5,
      awayWin: 26.3,
      score: '2-1',
      confidence: 72,
    },
  },
  {
    id: 2,
    homeTeam: { id: 529, name: 'Barcelona', logoUrl: null },
    awayTeam: { id: 541, name: 'Real Madrid', logoUrl: null },
    league: { id: 140, name: 'La Liga', logoUrl: null },
    matchDate: new Date().toISOString(),
    status: 'SCHEDULED' as const,
    prediction: {
      homeWin: 52.1,
      draw: 16.1,
      awayWin: 31.8,
      score: '1-0',
      confidence: 68,
    },
  },
  {
    id: 3,
    homeTeam: { id: 157, name: 'Bayern Munich', logoUrl: null },
    awayTeam: { id: 165, name: 'Borussia Dortmund', logoUrl: null },
    league: { id: 78, name: 'Bundesliga', logoUrl: null },
    matchDate: new Date().toISOString(),
    status: 'LIVE' as const,
    minute: 67,
    homeScore: 2,
    awayScore: 1,
    prediction: {
      homeWin: 61.5,
      draw: 22.3,
      awayWin: 16.2,
      score: '2-0',
      confidence: 78,
    },
  },
]

export function MatchList() {
  const { data: upcomingData, isLoading: upcomingLoading, error: upcomingError } = useTodayMatches()
  const { data: liveData, isLoading: liveLoading } = useLiveMatches()

  const isLoading = upcomingLoading || liveLoading
  const hasError = upcomingError

  // Use real data if available, otherwise fallback to mock
  const matches = upcomingData?.data || (hasError ? mockMatches : [])
  const liveMatches = liveData?.data || []

  // Combine live matches at the top
  const allMatches = [...liveMatches, ...matches.filter(m => m.status !== 'LIVE')]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Maçlar yükleniyor...</span>
      </div>
    )
  }

  if (allMatches.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">Bugün için maç bulunamadı.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {allMatches.map((match) => (
        <MatchCard
          key={match.id}
          match={{
            id: match.id,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            homeTeamLogo: match.homeTeam.logoUrl,
            awayTeamLogo: match.awayTeam.logoUrl,
            league: match.league.name,
            time: new Date(match.matchDate).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            status: match.status === 'LIVE' || match.status === 'HALFTIME'
              ? 'live'
              : match.status === 'FINISHED'
                ? 'finished'
                : 'upcoming',
            minute: match.minute,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
          }}
          prediction={
            (match as any).prediction || {
              homeWin: 33.3,
              draw: 33.3,
              awayWin: 33.3,
              score: '-',
              confidence: 0,
            }
          }
        />
      ))}
    </div>
  )
}
