'use client'

import { useState } from 'react'
import { Star, Plus, Bell, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { LEAGUES, COUNTRY_FLAGS } from '@/lib/api'

// Mock favorite teams
const mockFavoriteTeams = [
  {
    id: '64',
    name: 'Liverpool',
    code: 'LIV',
    logoUrl: 'https://crests.football-data.org/64.png',
    league: 'Premier League',
    leagueCode: 'PL',
  },
  {
    id: '610',
    name: 'Galatasaray',
    code: 'GS',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Galatasaray_Sports_Club_Logo.png',
    league: 'Süper Lig',
    leagueCode: 'TSL',
  },
  {
    id: '86',
    name: 'Real Madrid',
    code: 'RMA',
    logoUrl: 'https://crests.football-data.org/86.png',
    league: 'La Liga',
    leagueCode: 'PD',
  },
]

// Mock favorite leagues
const mockFavoriteLeagues = ['PL', 'TSL', 'CL']

interface FavoriteTeamCardProps {
  team: typeof mockFavoriteTeams[0]
  onRemove: () => void
}

function FavoriteTeamCard({ team, onRemove }: FavoriteTeamCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="neon-card rounded-2xl p-4 relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-4 cursor-default">
        {team.logoUrl ? (
          <Image
            src={team.logoUrl}
            alt={team.name}
            width={56}
            height={56}
            className="object-contain"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-xl font-bold">
            {team.code?.charAt(0) || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate group-hover:text-[#0EA5E9] transition-colors">{team.name}</h3>
          <p className="text-sm text-muted-foreground">{team.league}</p>
        </div>
        <Bell className="w-5 h-5 text-[#FBBF24]" />
      </div>

      {/* Remove button */}
      {isHovered && (
        <button
          onClick={(e) => {
            e.preventDefault()
            onRemove()
          }}
          className="absolute top-2 right-2 p-2 rounded-lg bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors"
          style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.2)' }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

interface FavoriteLeagueCardProps {
  leagueCode: string
  onRemove: () => void
}

function FavoriteLeagueCard({ leagueCode, onRemove }: FavoriteLeagueCardProps) {
  const league = LEAGUES[leagueCode]
  const flag = COUNTRY_FLAGS[league?.countryCode || ''] || ''
  const [isHovered, setIsHovered] = useState(false)

  if (!league) return null

  return (
    <div
      className="neon-card rounded-2xl p-4 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/league/${leagueCode}`} className="flex items-center gap-4 group">
        <span className="text-3xl">{flag}</span>
        {league.logoUrl && (
          <Image
            src={league.logoUrl}
            alt={league.name}
            width={40}
            height={40}
            className="object-contain"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate group-hover:text-[#0EA5E9] transition-colors">{league.name}</h3>
          <p className="text-sm text-muted-foreground">{league.country}</p>
        </div>
      </Link>

      {/* Remove button */}
      {isHovered && (
        <button
          onClick={(e) => {
            e.preventDefault()
            onRemove()
          }}
          className="absolute top-2 right-2 p-2 rounded-lg bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors"
          style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.2)' }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export default function FavoritesPage() {
  const [favoriteTeams, setFavoriteTeams] = useState(mockFavoriteTeams)
  const [favoriteLeagues, setFavoriteLeagues] = useState(mockFavoriteLeagues)

  const removeTeam = (id: string) => {
    setFavoriteTeams(teams => teams.filter(t => t.id !== id))
  }

  const removeLeague = (code: string) => {
    setFavoriteLeagues(leagues => leagues.filter(l => l !== code))
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-3 sm:px-4 pb-8">
        {/* Page Header */}
        <div className="py-4 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] bg-clip-text text-transparent">
            Favorilerim
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Takımlarınızı ve liglerinizi takip edin</p>
        </div>

        {/* Favorite Teams */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">
              Favori Takımlar
            </h2>
            <button className="btn-neon flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm">
              <Plus className="w-4 h-4" />
              Takım Ekle
            </button>
          </div>

          {favoriteTeams.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {favoriteTeams.map((team) => (
                <FavoriteTeamCard
                  key={team.id}
                  team={team}
                  onRemove={() => removeTeam(team.id)}
                />
              ))}
            </div>
          ) : (
            <div className="neon-card rounded-2xl p-12 text-center">
              <div className="flex justify-center mb-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(14, 165, 233, 0.2))',
                    boxShadow: '0 0 30px rgba(14, 165, 233, 0.2)'
                  }}
                >
                  <Star className="w-8 h-8 text-[#0EA5E9]" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Henüz favori takımınız yok</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Favori takımlarınızı ekleyerek maçlarını takip edin
              </p>
              <button className="btn-neon inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm">
                <Plus className="w-4 h-4" />
                Takım Ekle
              </button>
            </div>
          )}
        </section>

        {/* Favorite Leagues */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-[#0EA5E9] to-[#10B981] bg-clip-text text-transparent">
              Favori Ligler
            </h2>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm text-white"
              style={{
                background: 'linear-gradient(135deg, #0EA5E9, #10B981)',
                boxShadow: '0 0 20px rgba(14, 165, 233, 0.4)'
              }}
            >
              <Plus className="w-4 h-4" />
              Lig Ekle
            </button>
          </div>

          {favoriteLeagues.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {favoriteLeagues.map((code) => (
                <FavoriteLeagueCard
                  key={code}
                  leagueCode={code}
                  onRemove={() => removeLeague(code)}
                />
              ))}
            </div>
          ) : (
            <div className="neon-card rounded-2xl p-12 text-center">
              <div className="flex justify-center mb-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(16, 185, 129, 0.2))',
                    boxShadow: '0 0 30px rgba(14, 165, 233, 0.2)'
                  }}
                >
                  <Star className="w-8 h-8 text-[#10B981]" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Henüz favori liginiz yok</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Favori liglerinizi ekleyerek maçları takip edin
              </p>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm text-white"
                style={{
                  background: 'linear-gradient(135deg, #0EA5E9, #10B981)',
                  boxShadow: '0 0 20px rgba(14, 165, 233, 0.4)'
                }}
              >
                <Plus className="w-4 h-4" />
                Lig Ekle
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
