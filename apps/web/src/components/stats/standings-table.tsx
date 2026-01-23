'use client'

import { useStandings } from '@/hooks/useStats'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'

interface StandingsTableProps {
  leagueId: number
  season?: number
}

export function StandingsTable({ leagueId, season }: StandingsTableProps) {
  const { data, isLoading, error } = useStandings(leagueId, season)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center text-muted-foreground">
        Sıralama yüklenemedi.
      </div>
    )
  }

  const standings = data.data

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">#</th>
            <th className="px-4 py-3 text-left font-medium">Takım</th>
            <th className="px-2 py-3 text-center font-medium">O</th>
            <th className="px-2 py-3 text-center font-medium">G</th>
            <th className="px-2 py-3 text-center font-medium">B</th>
            <th className="px-2 py-3 text-center font-medium">M</th>
            <th className="px-2 py-3 text-center font-medium">A</th>
            <th className="px-2 py-3 text-center font-medium">Y</th>
            <th className="px-2 py-3 text-center font-medium">AV</th>
            <th className="px-4 py-3 text-center font-medium">P</th>
            <th className="px-4 py-3 text-center font-medium">Form</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {standings.map((entry, index) => (
            <tr
              key={entry.team.id}
              className={cn(
                'transition-colors hover:bg-muted/30',
                index < 4 && 'border-l-2 border-l-win',
                index >= standings.length - 3 && 'border-l-2 border-l-loss'
              )}
            >
              <td className="px-4 py-3 font-medium">{entry.position}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {entry.team.logoUrl ? (
                    <Image
                      src={entry.team.logoUrl}
                      alt={entry.team.name}
                      width={24}
                      height={24}
                      className="rounded"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                      {entry.team.name.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium">{entry.team.name}</span>
                </div>
              </td>
              <td className="px-2 py-3 text-center text-muted-foreground">{entry.played}</td>
              <td className="px-2 py-3 text-center text-win">{entry.won}</td>
              <td className="px-2 py-3 text-center text-draw">{entry.drawn}</td>
              <td className="px-2 py-3 text-center text-loss">{entry.lost}</td>
              <td className="px-2 py-3 text-center">{entry.goalsFor}</td>
              <td className="px-2 py-3 text-center">{entry.goalsAgainst}</td>
              <td className="px-2 py-3 text-center">
                <span
                  className={cn(
                    entry.goalDifference > 0 && 'text-win',
                    entry.goalDifference < 0 && 'text-loss'
                  )}
                >
                  {entry.goalDifference > 0 ? '+' : ''}
                  {entry.goalDifference}
                </span>
              </td>
              <td className="px-4 py-3 text-center font-bold">{entry.points}</td>
              <td className="px-4 py-3">
                <FormIndicator form={entry.form} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FormIndicator({ form }: { form: string | null }) {
  if (!form) return <span className="text-muted-foreground">-</span>

  return (
    <div className="flex gap-1">
      {form.split('').map((result, i) => (
        <span
          key={i}
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded text-xs font-bold text-white',
            result === 'W' && 'bg-win',
            result === 'D' && 'bg-draw',
            result === 'L' && 'bg-loss'
          )}
        >
          {result === 'W' ? 'G' : result === 'D' ? 'B' : 'M'}
        </span>
      ))}
    </div>
  )
}
