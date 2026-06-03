'use client'

import { use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  TrendingUp,
  Shield,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import {
  useTeamDetail,
  useTeamFixtures,
  useTeamStats,
} from '@/hooks/use-team-detail'
import { useTeamForm } from '@/hooks/use-match-detail'
import { Skeleton } from '@/components/ui/skeleton'

interface TeamDetailPageProps {
  params: Promise<{ id: string }>
}

function FormBadge({ result }: { result: string }) {
  const colors: Record<string, string> = {
    W: 'bg-green-500 text-white',
    D: 'bg-yellow-500 text-white',
    L: 'bg-red-500 text-white',
  }
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${colors[result] || 'bg-muted text-muted-foreground'}`}
    >
      {result}
    </span>
  )
}

export default function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { id } = use(params)
  const teamId = parseInt(id)
  const { t, language } = useI18n()

  const { data: team, isLoading } = useTeamDetail(teamId)
  const { data: stats } = useTeamStats(teamId)
  const { data: fixtures } = useTeamFixtures(teamId)
  const { data: formData } = useTeamForm(teamId)

  if (isLoading) {
    return (
      <div className="w-full px-3 sm:px-4 py-6 space-y-6">
        <Skeleton className="h-5 w-32" />
        <div className="bg-card rounded-2xl border border-border/50 p-6 flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <h2 className="text-xl font-bold text-foreground mb-2">
          {t.teamDetail.notFound}
        </h2>
        <Link
          href="/matches"
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.teamDetail.backToMatches}
        </Link>
      </div>
    )
  }

  const statItems = stats
    ? [
        { label: t.teamDetail.matchesPlayed, value: stats.matchesPlayed },
        {
          label: t.teamDetail.wins,
          value: stats.wins,
          color: 'text-green-500',
        },
        {
          label: t.teamDetail.draws,
          value: stats.draws,
          color: 'text-yellow-500',
        },
        {
          label: t.teamDetail.losses,
          value: stats.losses,
          color: 'text-red-500',
        },
        { label: t.teamDetail.goalsFor, value: stats.goalsFor },
        { label: t.teamDetail.goalsAgainst, value: stats.goalsAgainst },
        {
          label: t.teamDetail.points,
          value: stats.points,
          color: 'text-primary',
        },
        {
          label: t.teamDetail.position,
          value: stats.leaguePosition ? `#${stats.leaguePosition}` : '-',
        },
      ]
    : []

  return (
    <div className="min-h-screen">
      <main className="w-full px-3 sm:px-4 pb-8">
        {/* Back Button */}
        <div className="py-4">
          <Link
            href="/matches"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.teamDetail.backToMatches}
          </Link>
        </div>

        {/* Team Header */}
        <div className="relative bg-card rounded-2xl border border-border/50 p-4 sm:p-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />

          <div className="relative flex items-center gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
              {team.logoUrl ? (
                <Image
                  src={team.logoUrl}
                  alt={team.name}
                  width={72}
                  height={72}
                  className="object-contain"
                />
              ) : (
                <Shield className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{team.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {team.code && (
                  <span className="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded">
                    {team.code}
                  </span>
                )}
                <span className="text-sm text-muted-foreground">
                  {team.country}
                </span>
              </div>
              {team.venueName && (
                <p className="text-xs text-muted-foreground mt-1">
                  {team.venueName}
                  {team.venueCity ? `, ${team.venueCity}` : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">{t.teamDetail.stats}</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statItems.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-card rounded-xl border border-border/50 p-3 text-center"
                >
                  <p className={`text-2xl font-bold ${stat.color || ''}`}>
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Win Rate & Goal Stats */}
        {stats && stats.matchesPlayed > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Win Rate */}
            <div className="bg-card rounded-xl border border-border/50 p-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3">
                {language === 'tr' ? 'Kazanma Oranı' : 'Win Rate'}
              </h3>
              <div className="flex h-3 rounded-full overflow-hidden bg-muted/50">
                <div
                  className="bg-green-500 transition-all duration-500"
                  style={{
                    width: `${(stats.wins / stats.matchesPlayed) * 100}%`,
                  }}
                />
                <div
                  className="bg-yellow-500 transition-all duration-500"
                  style={{
                    width: `${(stats.draws / stats.matchesPlayed) * 100}%`,
                  }}
                />
                <div
                  className="bg-red-500 transition-all duration-500"
                  style={{
                    width: `${(stats.losses / stats.matchesPlayed) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-medium">
                <span className="text-green-500">
                  {t.teamDetail.wins} %
                  {Math.round((stats.wins / stats.matchesPlayed) * 100)}
                </span>
                <span className="text-yellow-500">
                  {t.teamDetail.draws} %
                  {Math.round((stats.draws / stats.matchesPlayed) * 100)}
                </span>
                <span className="text-red-500">
                  {t.teamDetail.losses} %
                  {Math.round((stats.losses / stats.matchesPlayed) * 100)}
                </span>
              </div>
            </div>

            {/* Goals Per Game */}
            <div className="bg-card rounded-xl border border-border/50 p-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3">
                {language === 'tr' ? 'Maç Başına Gol' : 'Goals Per Game'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">
                    {(stats.goalsFor / stats.matchesPlayed).toFixed(1)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {language === 'tr' ? 'Atılan' : 'Scored'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">
                    {(stats.goalsAgainst / stats.matchesPlayed).toFixed(1)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {language === 'tr' ? 'Yenilen' : 'Conceded'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {formData?.form && formData.form.length > 0 && (
          <div className="mt-6 bg-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">{t.teamDetail.form}</h2>
              <span className="text-[10px] text-muted-foreground">
                ({t.matchDetail.last5})
              </span>
            </div>
            <div className="flex gap-2">
              {formData.form.map((r, i) => (
                <FormBadge key={i} result={r} />
              ))}
            </div>
          </div>
        )}

        {/* Recent Matches */}
        {fixtures && fixtures.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-[#22D3EE]" />
              <h2 className="font-semibold text-sm">
                {t.teamDetail.recentMatches}
              </h2>
            </div>
            <div className="space-y-2">
              {fixtures.slice(0, 10).map((fixture) => {
                const isHome = fixture.homeTeam.id === teamId
                const teamScore = isHome ? fixture.homeScore : fixture.awayScore
                const oppScore = isHome ? fixture.awayScore : fixture.homeScore
                const opponent = isHome ? fixture.awayTeam : fixture.homeTeam

                let resultColor = ''
                if (
                  teamScore !== null &&
                  oppScore !== null &&
                  teamScore !== undefined &&
                  oppScore !== undefined
                ) {
                  if (teamScore > oppScore) resultColor = 'border-l-green-500'
                  else if (teamScore < oppScore)
                    resultColor = 'border-l-red-500'
                  else resultColor = 'border-l-yellow-500'
                }

                return (
                  <Link
                    key={fixture.id}
                    href={`/matches/${fixture.id}`}
                    className={`flex items-center justify-between bg-card rounded-lg border border-border/50 border-l-4 ${resultColor} p-3 hover:bg-muted/30 transition-colors`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-muted-foreground w-16 shrink-0">
                        {new Date(fixture.matchDate).toLocaleDateString(
                          'tr-TR',
                          {
                            day: 'numeric',
                            month: 'short',
                          }
                        )}
                      </span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        {opponent.logoUrl && (
                          <Image
                            src={opponent.logoUrl}
                            alt={opponent.name}
                            width={16}
                            height={16}
                            className="rounded shrink-0"
                          />
                        )}
                        <span className="text-xs font-medium truncate">
                          {isHome ? 'vs' : '@'} {opponent.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold tabular-nums">
                        {fixture.homeScore ?? '-'} - {fixture.awayScore ?? '-'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {fixture.league.name}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
