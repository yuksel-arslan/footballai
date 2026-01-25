'use client'

import { use } from 'react'
import { Header } from '@/components/layout/header'
import { MatchList } from '@/components/matches/match-list'
import { SectionTitle } from '@/components/ui/gradient-title'
import { Trophy, Calendar, Star, TrendingUp, Users } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { LEAGUES, MOCK_STANDINGS, COUNTRY_FLAGS, type Standing } from '@/lib/api'

function FormBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  const colors = {
    W: 'bg-green-500',
    D: 'bg-yellow-500',
    L: 'bg-red-500',
  }

  return (
    <div className={`w-5 h-5 rounded-full ${colors[result]} flex items-center justify-center`}>
      <span className="text-[10px] font-bold text-white">{result}</span>
    </div>
  )
}

function StandingsTable({ standings }: { standings: Standing[] }) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/50 text-xs font-medium text-muted-foreground uppercase">
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
            <div className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors ${
              standing.position <= 4 ? 'border-l-2 border-green-500' : ''
            }`}>
              <span className={`w-6 text-center text-sm font-bold ${
                standing.position <= 4 ? 'text-green-500' : 'text-muted-foreground'
              }`}>
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
                <span className="text-sm font-medium truncate">{standing.team.name}</span>
              </div>

              <span className="w-8 text-center text-sm text-muted-foreground hidden sm:block">{standing.played}</span>
              <span className="w-8 text-center text-sm text-green-500 hidden sm:block">{standing.won}</span>
              <span className="w-8 text-center text-sm text-yellow-500 hidden sm:block">{standing.drawn}</span>
              <span className="w-8 text-center text-sm text-red-500 hidden sm:block">{standing.lost}</span>
              <span className="w-10 text-center text-sm hidden md:block">
                {standing.goalDifference > 0 ? '+' : ''}{standing.goalDifference}
              </span>

              <div className="w-24 hidden lg:flex items-center justify-center gap-1">
                {standing.form.map((result, i) => (
                  <FormBadge key={i} result={result} />
                ))}
              </div>

              <span className="w-10 text-right text-sm font-bold">{standing.points}</span>
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/standings"
        className="block text-center py-3 text-sm text-primary hover:underline border-t border-border/50"
      >
        Tam Tabloyu Gör
      </Link>
    </div>
  )
}

export default function LeaguePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const league = LEAGUES[code.toUpperCase()]
  const flag = COUNTRY_FLAGS[league?.countryCode || ''] || ''
  const standings = MOCK_STANDINGS[code.toUpperCase()] || []

  if (!league) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold">Lig bulunamadı</h1>
          <p className="text-muted-foreground mt-2">Geçersiz lig kodu: {code}</p>
          <Link href="/standings" className="text-primary hover:underline mt-4 inline-block">
            Tüm Liglere Git
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 pb-12">
        {/* League Header */}
        <div className="relative py-12 lg:py-16">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2" />
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
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                {league.name}
              </h1>
              <p className="text-lg text-muted-foreground mt-2">{league.country}</p>
            </div>
            <button className="ml-auto p-3 rounded-xl glass-card hover:bg-muted/50 transition-colors">
              <Star className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
                <span className="text-sm">Takım Sayısı</span>
              </div>
              <p className="text-2xl font-bold">{standings.length || 20}</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Oynanan Maç</span>
              </div>
              <p className="text-2xl font-bold">{standings[0]?.played || 0}</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Trophy className="w-4 h-4" />
                <span className="text-sm">Lider</span>
              </div>
              <p className="text-lg font-bold truncate">{standings[0]?.team.name || '-'}</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Toplam Gol</span>
              </div>
              <p className="text-2xl font-bold">
                {standings.reduce((acc, s) => acc + s.goalsFor, 0) || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left - Matches */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <SectionTitle gradient="primary" description="Bu haftanın maçları">
                Yaklaşan Maçlar
              </SectionTitle>
              <MatchList filter="upcoming" limit={4} />
            </section>

            <section>
              <SectionTitle gradient="secondary" description="Son oynanan maçlar">
                Son Sonuçlar
              </SectionTitle>
              <MatchList filter="finished" limit={4} />
            </section>
          </div>

          {/* Right - Standings */}
          <div className="space-y-8">
            <section>
              <SectionTitle gradient="accent">Puan Tablosu</SectionTitle>
              <StandingsTable standings={standings} />
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
