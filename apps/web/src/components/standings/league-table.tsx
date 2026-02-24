'use client'

import { useState } from 'react'
import { Trophy, ChevronDown, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useStandings } from '@/hooks/use-fixtures'
import type { Standing } from '@/lib/api'

interface League {
  id: string
  name: string
  logo?: string
}

const leagues: League[] = [
  { id: 'PL', name: 'Premier League', logo: 'https://crests.football-data.org/PL.png' },
  { id: 'PD', name: 'La Liga', logo: 'https://crests.football-data.org/PD.png' },
  { id: 'BL1', name: 'Bundesliga', logo: 'https://crests.football-data.org/BL1.png' },
  { id: 'SA', name: 'Serie A', logo: 'https://crests.football-data.org/SA.png' },
  { id: 'TSL', name: 'Süper Lig', logo: 'https://upload.wikimedia.org/wikipedia/tr/7/7f/S%C3%BCper_Lig_logo.png' },
  { id: 'FL1', name: 'Ligue 1', logo: 'https://crests.football-data.org/FL1.png' },
]

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

function TeamRow({ standing, isTop4 }: { standing: Standing; isTop4: boolean }) {
  return (
    <div className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors ${
      isTop4 ? 'border-l-2 border-primary' : ''
    }`}>
        {/* Position */}
        <span className={`w-6 text-center font-bold text-sm ${
          standing.position <= 4 ? 'text-primary' : 'text-muted-foreground'
        }`}>
          {standing.position}
        </span>

        {/* Team */}
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
              {standing.team.code?.charAt(0) || '?'}
            </div>
          )}
          <span className="font-medium text-sm truncate">
            {standing.team.code || standing.team.name}
          </span>
        </div>

        {/* Stats - Desktop */}
        <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
          <span className="w-8 text-center">{standing.played}</span>
          <span className="w-8 text-center">{standing.won}</span>
          <span className="w-8 text-center">{standing.drawn}</span>
          <span className="w-8 text-center">{standing.lost}</span>
          <span className="w-12 text-center">
            {standing.goalDifference > 0 ? '+' : ''}{standing.goalDifference}
          </span>
        </div>

        {/* Form */}
        <div className="hidden sm:flex items-center gap-1">
          {standing.form?.map((result, i) => (
            <FormBadge key={i} result={result} />
          ))}
        </div>

        {/* Points */}
        <span className="w-10 text-right font-bold text-sm">
          {standing.points}
        </span>
      </div>
  )
}

export function LeagueTable() {
  const [selectedLeague, setSelectedLeague] = useState(leagues[0])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const { data: standings = [], isLoading } = useStandings(selectedLeague.id)

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Puan Tablosu</h3>
          </div>

          {/* League Selector */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              {selectedLeague.logo && (
                <Image
                  src={selectedLeague.logo}
                  alt={selectedLeague.name}
                  width={20}
                  height={20}
                  className="object-contain"
                />
              )}
              <span className="text-sm font-medium">{selectedLeague.name}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 py-1 rounded-xl bg-popover border border-border shadow-lg z-10">
                {leagues.map((league) => (
                  <button
                    key={league.id}
                    onClick={() => {
                      setSelectedLeague(league)
                      setIsDropdownOpen(false)
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors ${
                      selectedLeague.id === league.id ? 'bg-muted/50' : ''
                    }`}
                  >
                    {league.logo && (
                      <Image
                        src={league.logo}
                        alt={league.name}
                        width={20}
                        height={20}
                        className="object-contain"
                      />
                    )}
                    <span className="text-sm">{league.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column Headers */}
        <div className="flex items-center gap-3 mt-4 px-3 text-xs font-medium text-muted-foreground uppercase">
          <span className="w-6 text-center">#</span>
          <span className="flex-1">Takım</span>
          <div className="hidden md:flex items-center gap-4">
            <span className="w-8 text-center">O</span>
            <span className="w-8 text-center">G</span>
            <span className="w-8 text-center">B</span>
            <span className="w-8 text-center">M</span>
            <span className="w-12 text-center">AV</span>
          </div>
          <span className="hidden sm:block w-[108px] text-center">Form</span>
          <span className="w-10 text-right">P</span>
        </div>
      </div>

      {/* Table Body */}
      <div className="p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Yükleniyor...</span>
          </div>
        ) : standings.length > 0 ? (
          standings.slice(0, 8).map((standing) => (
            <TeamRow
              key={standing.team.id}
              standing={standing}
              isTop4={standing.position <= 4}
            />
          ))
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Puan tablosu verisi yükleniyor...
          </div>
        )}
      </div>

      {/* View All Link */}
      <div className="p-3 border-t border-border/50">
        <Link
          href={`/league/${selectedLeague.id}`}
          className="block text-center text-sm text-primary hover:underline"
        >
          Tam Tabloyu Gör
        </Link>
      </div>
    </div>
  )
}
