'use client'

import { useState } from 'react'
import { Trophy, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface TeamStanding {
  position: number
  team: {
    id: string
    name: string
    shortName?: string
    crest?: string
  }
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  form?: ('W' | 'D' | 'L')[]
}

interface League {
  id: string
  name: string
  logo?: string
}

// Mock data
const leagues: League[] = [
  { id: 'PL', name: 'Premier League', logo: 'https://crests.football-data.org/PL.png' },
  { id: 'PD', name: 'La Liga', logo: 'https://crests.football-data.org/PD.png' },
  { id: 'BL1', name: 'Bundesliga', logo: 'https://crests.football-data.org/BL1.png' },
  { id: 'SA', name: 'Serie A', logo: 'https://crests.football-data.org/SA.png' },
]

const mockStandings: TeamStanding[] = [
  {
    position: 1,
    team: { id: '64', name: 'Liverpool', shortName: 'LIV', crest: 'https://crests.football-data.org/64.png' },
    played: 20, won: 15, drawn: 3, lost: 2, goalsFor: 45, goalsAgainst: 15, goalDifference: 30, points: 48,
    form: ['W', 'W', 'D', 'W', 'W'],
  },
  {
    position: 2,
    team: { id: '65', name: 'Manchester City', shortName: 'MCI', crest: 'https://crests.football-data.org/65.png' },
    played: 20, won: 14, drawn: 4, lost: 2, goalsFor: 42, goalsAgainst: 18, goalDifference: 24, points: 46,
    form: ['W', 'D', 'W', 'W', 'D'],
  },
  {
    position: 3,
    team: { id: '57', name: 'Arsenal', shortName: 'ARS', crest: 'https://crests.football-data.org/57.png' },
    played: 20, won: 13, drawn: 5, lost: 2, goalsFor: 38, goalsAgainst: 16, goalDifference: 22, points: 44,
    form: ['D', 'W', 'W', 'D', 'W'],
  },
  {
    position: 4,
    team: { id: '61', name: 'Chelsea', shortName: 'CHE', crest: 'https://crests.football-data.org/61.png' },
    played: 20, won: 11, drawn: 5, lost: 4, goalsFor: 35, goalsAgainst: 22, goalDifference: 13, points: 38,
    form: ['L', 'W', 'D', 'W', 'W'],
  },
  {
    position: 5,
    team: { id: '66', name: 'Manchester United', shortName: 'MUN', crest: 'https://crests.football-data.org/66.png' },
    played: 20, won: 10, drawn: 5, lost: 5, goalsFor: 30, goalsAgainst: 25, goalDifference: 5, points: 35,
    form: ['W', 'L', 'D', 'W', 'L'],
  },
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

function TeamRow({ standing, isTop4 }: { standing: TeamStanding; isTop4: boolean }) {
  return (
    <Link href={`/team/${standing.team.id}`}>
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
          {standing.team.crest ? (
            <Image
              src={standing.team.crest}
              alt={standing.team.name}
              width={24}
              height={24}
              className="object-contain"
            />
          ) : (
            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs">
              {standing.team.shortName?.charAt(0) || '?'}
            </div>
          )}
          <span className="font-medium text-sm truncate">
            {standing.team.shortName || standing.team.name}
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
    </Link>
  )
}

export function LeagueTable() {
  const [selectedLeague, setSelectedLeague] = useState(leagues[0])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

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
        {mockStandings.map((standing) => (
          <TeamRow
            key={standing.team.id}
            standing={standing}
            isTop4={standing.position <= 4}
          />
        ))}
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
