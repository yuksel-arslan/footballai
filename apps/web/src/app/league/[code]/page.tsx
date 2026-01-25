'use client'

import { use } from 'react'
import { MatchList } from '@/components/matches/match-list'
import { SectionTitle } from '@/components/ui/gradient-title'
import { Trophy, Calendar, Star, TrendingUp, Users, Key, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { LEAGUES, COUNTRY_FLAGS, type Standing, ApiConfigError } from '@/lib/api'
import { useStandings } from '@/hooks/use-fixtures'

function FormBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  const styles = {
    W: { bg: '#10B981', shadow: 'rgba(16, 185, 129, 0.5)' },
    D: { bg: '#FBBF24', shadow: 'rgba(251, 191, 36, 0.5)' },
    L: { bg: '#EF4444', shadow: 'rgba(239, 68, 68, 0.5)' },
  }

  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center"
      style={{
        background: styles[result].bg,
        boxShadow: `0 0 8px ${styles[result].shadow}`
      }}
    >
      <span className="text-[10px] font-bold text-white">{result}</span>
    </div>
  )
}

function StandingsTable({ standings, isLoading, isError, error }: {
  standings: Standing[]
  isLoading: boolean
  isError: boolean
  error: Error | null
}) {
  if (isError && (error instanceof ApiConfigError || error?.message?.includes('API anahtarı'))) {
    return (
      <div className="neon-card rounded-2xl p-6 text-center border border-[#FBBF24]/30 bg-[#FBBF24]/5">
        <Key className="w-6 h-6 text-[#FBBF24] mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          API anahtarı gerekli.{' '}
          <a href="https://www.football-data.org/client/register" target="_blank" className="text-[#0EA5E9] hover:underline">
            Ücretsiz al
          </a>
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="neon-card rounded-2xl p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0EA5E9]" />
      </div>
    )
  }

  if (standings.length === 0) {
    return (
      <div className="neon-card rounded-2xl p-6 text-center">
        <p className="text-sm text-muted-foreground">Puan durumu bulunamadı.</p>
      </div>
    )
  }

  return (
    <div className="neon-card rounded-2xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-[#0EA5E9]/10 text-xs font-medium text-muted-foreground uppercase"
        style={{ background: 'linear-gradient(180deg, rgba(14, 165, 233, 0.05), transparent)' }}
      >
        <span className="w-6 text-center">#</span>
        <span className="flex-1">Takım</span>
        <span className="w-8 text-center hidden sm:block">O</span>
        <span className="w-8 text-center hidden sm:block">G</span>
        <span className="w-8 text-center hidden sm:block">B</span>
        <span className="w-8 text-center hidden sm:block">M</span>
        <span className="w-10 text-center hidden md:block">AV</span>
        <span className="w-24 text-center hidden lg:block">Form</span>
        <span className="w-10 text-right">P</span>
      </div>

      <div className="p-1">
        {standings.slice(0, 8).map((standing) => (
          <Link key={standing.team.id} href={`/team/${standing.team.id}`}>
            <div className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#0EA5E9]/5 transition-all group ${
              standing.position <= 4 ? 'border-l-2 border-[#10B981]' : ''
            }`}>
              <span
                className="w-6 text-center text-sm font-bold"
                style={{
                  color: standing.position <= 4 ? '#10B981' : undefined,
                  textShadow: standing.position <= 4 ? '0 0 8px rgba(16, 185, 129, 0.5)' : undefined
                }}
              >
                {standing.position}
              </span>

              <div className="flex-1 flex items-center gap-2 min-w-0">
                {standing.team.logoUrl ? (
                  <Image
                    src={standing.team.logoUrl}
                    alt={standing.team.name}
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                ) : (
                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs">
                    {standing.team.code?.charAt(0)}
                  </div>
                )}
                <span className="text-sm font-medium truncate group-hover:text-[#0EA5E9] transition-colors">{standing.team.name}</span>
              </div>

              <span className="w-8 text-center text-sm text-muted-foreground hidden sm:block">{standing.played}</span>
              <span className="w-8 text-center text-sm text-[#10B981] hidden sm:block">{standing.won}</span>
              <span className="w-8 text-center text-sm text-[#FBBF24] hidden sm:block">{standing.drawn}</span>
              <span className="w-8 text-center text-sm text-[#EF4444] hidden sm:block">{standing.lost}</span>
              <span className="w-10 text-center text-sm hidden md:block">
                {standing.goalDifference > 0 ? '+' : ''}{standing.goalDifference}
              </span>

              <div className="w-24 hidden lg:flex items-center justify-center gap-1">
                {standing.form.map((result, i) => (
                  <FormBadge key={i} result={result} />
                ))}
              </div>

              <span
                className="w-10 text-right text-sm font-bold text-[#0EA5E9]"
                style={{ textShadow: '0 0 8px rgba(14, 165, 233, 0.3)' }}
              >
                {standing.points}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/standings"
        className="block text-center py-3 text-sm text-[#0EA5E9] hover:text-[#2563EB] border-t border-[#0EA5E9]/10 transition-colors"
      >
        Tam Tabloyu Gör
      </Link>
    </div>
  )
}

export default function LeaguePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const leagueCode = code.toUpperCase()
  const league = LEAGUES[leagueCode]
  const flag = COUNTRY_FLAGS[league?.countryCode || ''] || ''

  const { data: standings = [], isLoading, isError, error } = useStandings(leagueCode)

  if (!league) {
    return (
      <div className="min-h-screen">
        <main className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold">Lig bulunamadı</h1>
          <p className="text-muted-foreground mt-2">Geçersiz lig kodu: {code}</p>
          <Link href="/standings" className="text-[#0EA5E9] hover:text-[#2563EB] mt-4 inline-block transition-colors">
            Tüm Liglere Git
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 pb-12">
        {/* League Header with Neon */}
        <div className="relative py-12 lg:py-16">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute top-1/2 left-1/4 w-72 h-72 rounded-full blur-3xl -translate-y-1/2 opacity-30 dark:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2563EB, #0EA5E9)' }}
            />
            <div
              className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-20 dark:opacity-30"
              style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)' }}
            />
          </div>

          <div className="relative flex items-center gap-6">
            <span className="text-6xl">{flag}</span>
            {league.logoUrl && (
              <Image
                src={league.logoUrl}
                alt={league.name}
                width={80}
                height={80}
                className="object-contain"
              />
            )}
            <div>
              <h1
                className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[#2563EB] via-[#0EA5E9] to-[#FBBF24] bg-clip-text text-transparent"
                style={{ filter: 'drop-shadow(0 0 25px rgba(14, 165, 233, 0.4))' }}
              >
                {league.name}
              </h1>
              <p className="text-lg text-muted-foreground mt-2">{league.country}</p>
              <div
                className="h-1 w-24 mt-4 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #2563EB, #0EA5E9, transparent)',
                  boxShadow: '0 0 15px rgba(14, 165, 233, 0.5)'
                }}
              />
            </div>
            <button
              className="ml-auto p-3 rounded-xl glass-card hover:bg-muted/50 transition-all border border-[#FBBF24]/20 hover:border-[#FBBF24]/40 hover:shadow-neon-gold"
            >
              <Star className="w-6 h-6 text-[#FBBF24]" />
            </button>
          </div>

          {/* Quick Stats with Neon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { icon: Users, label: 'Takım Sayısı', value: standings.length || '-', color: 'blue' },
              { icon: Calendar, label: 'Oynanan Maç', value: standings[0]?.played || '-', color: 'cyan' },
              { icon: Trophy, label: 'Lider', value: standings[0]?.team.name || '-', color: 'gold' },
              { icon: TrendingUp, label: 'Toplam Gol', value: standings.reduce((acc, s) => acc + s.goalsFor, 0) || '-', color: 'green' },
            ].map((stat, i) => {
              const colors = {
                blue: { text: '#2563EB', glow: 'rgba(37, 99, 235, 0.3)' },
                cyan: { text: '#0EA5E9', glow: 'rgba(14, 165, 233, 0.3)' },
                gold: { text: '#FBBF24', glow: 'rgba(251, 191, 36, 0.3)' },
                green: { text: '#10B981', glow: 'rgba(16, 185, 129, 0.3)' },
              }
              const c = colors[stat.color as keyof typeof colors]

              return (
                <div key={i} className="stat-card-neon">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <stat.icon className="w-4 h-4" style={{ color: c.text }} />
                    <span className="text-sm">{stat.label}</span>
                  </div>
                  <p
                    className={`${typeof stat.value === 'string' ? 'text-lg' : 'text-2xl'} font-bold truncate`}
                    style={{ color: c.text, textShadow: `0 0 15px ${c.glow}` }}
                  >
                    {stat.value}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left - Matches */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <SectionTitle gradient="primary" description="Bu haftanın maçları" neonGlow>
                Yaklaşan Maçlar
              </SectionTitle>
              <MatchList filter="upcoming" limit={4} />
            </section>

            <section>
              <SectionTitle gradient="secondary" description="Son oynanan maçlar" neonGlow>
                Son Sonuçlar
              </SectionTitle>
              <MatchList filter="finished" limit={4} />
            </section>
          </div>

          {/* Right - Standings */}
          <div className="space-y-8">
            <section>
              <SectionTitle gradient="accent" neonGlow>Puan Tablosu</SectionTitle>
              <StandingsTable
                standings={standings}
                isLoading={isLoading}
                isError={isError}
                error={error}
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
