'use client'

import { MatchCard } from './match-card'

// Mock data - backend hazır olunca gerçek API'den gelecek
const mockMatches = [
  {
    id: 1,
    homeTeam: 'Manchester United',
    awayTeam: 'Liverpool',
    league: 'Premier League',
    time: '15:00',
    status: 'upcoming' as const,
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
    homeTeam: 'Barcelona',
    awayTeam: 'Real Madrid',
    league: 'La Liga',
    time: '17:30',
    status: 'upcoming' as const,
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
    homeTeam: 'Bayern Munich',
    awayTeam: 'Borussia Dortmund',
    league: 'Bundesliga',
    time: '18:30',
    status: 'live' as const,
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
  return (
    <div className="space-y-3">
      {mockMatches.map((match) => (
        <MatchCard key={match.id} match={match} prediction={match.prediction} />
      ))}
    </div>
  )
}
