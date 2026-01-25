'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/ui/gradient-title'
import { Trophy, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { LEAGUES, MOCK_STANDINGS, COUNTRY_FLAGS, type Standing } from '@/lib/api'

const leagueList = Object.entries(LEAGUES).map(([code, league]) => ({
  code,
  ...league,
  flag: COUNTRY_FLAGS[league.countryCode] || '',
}))

function FormBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  const colors = {
    W: 'bg-green-500',
    D: 'bg-yellow-500',
    L: 'bg-red-500',
  }

  return (
    <div className={`w-6 h-6 rounded-full ${colors[result]} flex items-center justify-center`}>
      <span className="text-xs font-bold text-white">{result}</span>
    </div>
  )
}

function TeamRow({ standing, isTop4, isRelegation }: { standing: Standing; isTop4: boolean; isRelegation: boolean }) {
  return (
    <Link href={`/team/${standing.team.id}`}>
      <div className={`group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors ${
        isTop4 ? 'border-l-4 border-green-500' : isRelegation ? 'border-l-4 border-red-500' : ''
      }`}>
        {/* Position */}
        <span className={`w-8 text-center font-bold ${
          isTop4 ? 'text-green-500' : isRelegation ? 'text-red-500' : 'text-muted-foreground'
        }`}>
          {standing.position}
        </span>

        {/* Team */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          {standing.team.logoUrl ? (
            <Image
              src={standing.team.logoUrl}
              alt={standing.team.name}
              width={32}
              height={32}
              className="object-contain"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold">
              {standing.team.code?.charAt(0) || '?'}
            </div>
          )}
          <span className="font-medium truncate">{standing.team.name}</span>
        </div>

        {/* Stats - Desktop */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <span className="w-10 text-center text-muted-foreground">{standing.played}</span>
          <span className="w-10 text-center text-green-500">{standing.won}</span>
          <span className="w-10 text-center text-yellow-500">{standing.drawn}</span>
          <span className="w-10 text-center text-red-500">{standing.lost}</span>
          <span className="w-12 text-center text-muted-foreground">{standing.goalsFor}</span>
          <span className="w-12 text-center text-muted-foreground">{standing.goalsAgainst}</span>
          <span className="w-12 text-center font-medium">
            {standing.goalDifference > 0 ? '+' : ''}{standing.goalDifference}
          </span>
        </div>

        {/* Form */}
        <div className="hidden lg:flex items-center gap-1">
          {standing.form.map((result, i) => (
            <FormBadge key={i} result={result} />
          ))}
        </div>

        {/* Points */}
        <span className="w-12 text-right font-bold text-lg">
          {standing.points}
        </span>
      </div>
    </Link>
  )
}

export default function StandingsPage() {
  const [selectedLeague, setSelectedLeague] = useState(leagueList[0])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const standings = MOCK_STANDINGS[selectedLeague.code] || []

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 pb-12">
        <PageHeader
          title="Puan Durumu"
          description="Avrupa'nın en iyi liglerinde güncel puan tabloları ve takım sıralamaları."
          gradient="accent"
          badge={{
            icon: <Trophy className="w-4 h-4 text-amber-500" />,
            text: 'Lig Tabloları',
          }}
        />

        {/* League Selector */}
        <div className="mb-8">
          <div className="relative inline-block">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 px-6 py-3 rounded-xl glass-card hover:bg-muted/50 transition-colors"
            >
              <span className="text-2xl">{selectedLeague.flag}</span>
              {selectedLeague.logoUrl && (
                <Image
                  src={selectedLeague.logoUrl}
                  alt={selectedLeague.name}
                  width={28}
                  height={28}
                  className="object-contain"
                />
              )}
              <div className="text-left">
                <span className="font-semibold">{selectedLeague.name}</span>
                <span className="text-sm text-muted-foreground ml-2">({selectedLeague.country})</span>
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 py-2 rounded-2xl bg-popover border border-border shadow-xl z-50">
                {leagueList.map((league) => (
                  <button
                    key={league.code}
                    onClick={() => {
                      setSelectedLeague(league)
                      setIsDropdownOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${
                      selectedLeague.code === league.code ? 'bg-muted/50' : ''
                    }`}
                  >
                    <span className="text-xl">{league.flag}</span>
                    {league.logoUrl && (
                      <Image
                        src={league.logoUrl}
                        alt={league.name}
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    )}
                    <div className="text-left">
                      <span className="font-medium">{league.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{league.country}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Standings Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-4 px-4 py-3 bg-muted/30 border-b border-border/50 text-xs font-medium text-muted-foreground uppercase">
            <span className="w-8 text-center">#</span>
            <span className="flex-1">Takım</span>
            <div className="hidden md:flex items-center gap-6">
              <span className="w-10 text-center">O</span>
              <span className="w-10 text-center">G</span>
              <span className="w-10 text-center">B</span>
              <span className="w-10 text-center">M</span>
              <span className="w-12 text-center">AG</span>
              <span className="w-12 text-center">YG</span>
              <span className="w-12 text-center">AV</span>
            </div>
            <span className="hidden lg:block w-[134px] text-center">Form</span>
            <span className="w-12 text-right">P</span>
          </div>

          {/* Rows */}
          <div className="p-2">
            {standings.length > 0 ? (
              standings.map((standing, index) => (
                <TeamRow
                  key={standing.team.id}
                  standing={standing}
                  isTop4={standing.position <= 4}
                  isRelegation={index >= standings.length - 3}
                />
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Bu lig için veri bulunamadı.
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-border/50 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-muted-foreground">Şampiyonlar Ligi</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-muted-foreground">Küme Düşme</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
