'use client'

import { useTeamStats, useTeamForm } from '@/hooks/useStats'
import { cn } from '@/lib/utils'
import { Loader2, TrendingUp, TrendingDown, Minus, Trophy, Target, Shield } from 'lucide-react'
import Image from 'next/image'

interface TeamStatsCardProps {
  teamId: number
  season?: number
}

export function TeamStatsCard({ teamId, season }: TeamStatsCardProps) {
  const { data: statsData, isLoading: statsLoading } = useTeamStats(teamId, season)
  const { data: formData, isLoading: formLoading } = useTeamForm(teamId)

  const isLoading = statsLoading || formLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-card p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!statsData?.data) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center text-muted-foreground">
        Takım istatistikleri yüklenemedi.
      </div>
    )
  }

  const { team, stats } = statsData.data
  const form = formData?.data?.summary

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        {team.logoUrl ? (
          <Image src={team.logoUrl} alt={team.name} width={64} height={64} className="rounded-lg" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-2xl font-bold text-primary">
            {team.name.charAt(0)}
          </div>
        )}
        <div>
          <h3 className="text-xl font-bold">{team.name}</h3>
          <p className="text-sm text-muted-foreground">{team.country}</p>
        </div>
        {stats.leaguePosition && (
          <div className="ml-auto text-right">
            <div className="text-3xl font-bold text-primary">#{stats.leaguePosition}</div>
            <p className="text-xs text-muted-foreground">Lig Sırası</p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatBox
          icon={<Trophy className="h-5 w-5" />}
          label="Maç"
          value={stats.matchesPlayed}
          color="primary"
        />
        <StatBox
          icon={<TrendingUp className="h-5 w-5" />}
          label="Galibiyet"
          value={stats.wins}
          color="win"
        />
        <StatBox
          icon={<Minus className="h-5 w-5" />}
          label="Beraberlik"
          value={stats.draws}
          color="draw"
        />
        <StatBox
          icon={<TrendingDown className="h-5 w-5" />}
          label="Mağlubiyet"
          value={stats.losses}
          color="loss"
        />
      </div>

      {/* Goals */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-win" />
            <span className="text-sm text-muted-foreground">Atılan Gol</span>
          </div>
          <div className="mt-2 text-2xl font-bold">{stats.goalsFor}</div>
          <div className="text-xs text-muted-foreground">
            Maç başı: {(stats.goalsFor / stats.matchesPlayed).toFixed(1)}
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-loss" />
            <span className="text-sm text-muted-foreground">Yenilen Gol</span>
          </div>
          <div className="mt-2 text-2xl font-bold">{stats.goalsAgainst}</div>
          <div className="text-xs text-muted-foreground">
            Maç başı: {(stats.goalsAgainst / stats.matchesPlayed).toFixed(1)}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-bold">{stats.points}</div>
          <div className="text-xs text-muted-foreground">Puan</div>
        </div>
        <div>
          <div
            className={cn(
              'text-lg font-bold',
              stats.goalDifference > 0 && 'text-win',
              stats.goalDifference < 0 && 'text-loss'
            )}
          >
            {stats.goalDifference > 0 ? '+' : ''}
            {stats.goalDifference}
          </div>
          <div className="text-xs text-muted-foreground">Averaj</div>
        </div>
        <div>
          <div className="text-lg font-bold">{stats.cleanSheets}</div>
          <div className="text-xs text-muted-foreground">Gol Yemeden</div>
        </div>
      </div>

      {/* Form */}
      {form && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">Son {form.played} Maç</h4>
          <div className="flex gap-1">
            {form.formString.split('').map((result, i) => (
              <span
                key={i}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded text-sm font-bold text-white',
                  result === 'W' && 'bg-win',
                  result === 'D' && 'bg-draw',
                  result === 'L' && 'bg-loss'
                )}
              >
                {result === 'W' ? 'G' : result === 'D' ? 'B' : 'M'}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'primary' | 'win' | 'draw' | 'loss'
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 text-center">
      <div
        className={cn(
          'mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full',
          color === 'primary' && 'bg-primary/20 text-primary',
          color === 'win' && 'bg-win/20 text-win',
          color === 'draw' && 'bg-draw/20 text-draw',
          color === 'loss' && 'bg-loss/20 text-loss'
        )}
      >
        {icon}
      </div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
