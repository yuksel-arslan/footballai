'use client'

import { useCompareTeams } from '@/hooks/useStats'
import { cn } from '@/lib/utils'
import { Loader2, Swords } from 'lucide-react'
import Image from 'next/image'

interface H2HComparisonProps {
  team1Id: number
  team2Id: number
}

export function H2HComparison({ team1Id, team2Id }: H2HComparisonProps) {
  const { data, isLoading, error } = useCompareTeams(team1Id, team2Id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-card p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center text-muted-foreground">
        Karşılaştırma yüklenemedi.
      </div>
    )
  }

  const { team1, team2, h2h } = data.data

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <TeamHeader team={team1.team} />
        <div className="flex flex-col items-center">
          <Swords className="h-8 w-8 text-primary" />
          <span className="mt-1 text-xs text-muted-foreground">vs</span>
        </div>
        <TeamHeader team={team2.team} />
      </div>

      {/* H2H Stats */}
      <div className="mb-6 rounded-lg bg-muted/50 p-4">
        <h4 className="mb-3 text-center text-sm font-medium">Kafa Kafaya ({h2h.stats.totalMatches} maç)</h4>
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-2xl font-bold text-win">{h2h.stats.team1Wins}</div>
            <div className="text-xs text-muted-foreground">Galibiyet</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-draw">{h2h.stats.draws}</div>
            <div className="text-xs text-muted-foreground">Beraberlik</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-loss">{h2h.stats.team2Wins}</div>
            <div className="text-xs text-muted-foreground">Galibiyet</div>
          </div>
        </div>
      </div>

      {/* Stats Comparison */}
      <div className="space-y-4">
        <ComparisonBar
          label="Maç"
          value1={team1.stats.matchesPlayed}
          value2={team2.stats.matchesPlayed}
        />
        <ComparisonBar
          label="Galibiyet"
          value1={team1.stats.wins}
          value2={team2.stats.wins}
          color="win"
        />
        <ComparisonBar
          label="Puan"
          value1={team1.stats.points}
          value2={team2.stats.points}
          color="primary"
        />
        <ComparisonBar
          label="Atılan Gol"
          value1={team1.stats.goalsFor}
          value2={team2.stats.goalsFor}
          color="win"
        />
        <ComparisonBar
          label="Yenilen Gol"
          value1={team1.stats.goalsAgainst}
          value2={team2.stats.goalsAgainst}
          color="loss"
          inverse
        />
        <ComparisonBar
          label="Lig Sırası"
          value1={team1.stats.leaguePosition || 0}
          value2={team2.stats.leaguePosition || 0}
          inverse
        />
      </div>

      {/* Last Matches */}
      {h2h.lastMatches.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-3 text-sm font-medium text-muted-foreground">Son Karşılaşmalar</h4>
          <div className="space-y-2">
            {h2h.lastMatches.slice(0, 5).map((match, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">
                  {new Date(match.date).toLocaleDateString('tr-TR')}
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn(match.homeTeam === team1.team.name && 'font-medium')}>
                    {match.homeTeam}
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 font-mono font-bold">
                    {match.homeScore} - {match.awayScore}
                  </span>
                  <span className={cn(match.awayTeam === team1.team.name && 'font-medium')}>
                    {match.awayTeam}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TeamHeader({ team }: { team: { id: number; name: string; logoUrl?: string | null } }) {
  return (
    <div className="flex flex-col items-center">
      {team.logoUrl ? (
        <Image src={team.logoUrl} alt={team.name} width={48} height={48} className="rounded-lg" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-xl font-bold text-primary">
          {team.name.charAt(0)}
        </div>
      )}
      <span className="mt-2 text-sm font-medium">{team.name}</span>
    </div>
  )
}

function ComparisonBar({
  label,
  value1,
  value2,
  color = 'primary',
  inverse = false,
}: {
  label: string
  value1: number
  value2: number
  color?: 'primary' | 'win' | 'loss'
  inverse?: boolean
}) {
  const total = value1 + value2 || 1
  const percent1 = (value1 / total) * 100
  const percent2 = (value2 / total) * 100

  const isValue1Better = inverse ? value1 < value2 : value1 > value2
  const isValue2Better = inverse ? value2 < value1 : value2 > value1

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className={cn('font-medium', isValue1Better && 'text-win')}>{value1}</span>
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium', isValue2Better && 'text-win')}>{value2}</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'transition-all',
            color === 'primary' && 'bg-primary',
            color === 'win' && 'bg-win',
            color === 'loss' && 'bg-loss'
          )}
          style={{ width: `${percent1}%` }}
        />
        <div className="flex-1 bg-muted" />
        <div
          className={cn(
            'transition-all',
            color === 'primary' && 'bg-primary/60',
            color === 'win' && 'bg-win/60',
            color === 'loss' && 'bg-loss/60'
          )}
          style={{ width: `${percent2}%` }}
        />
      </div>
    </div>
  )
}
