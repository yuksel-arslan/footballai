'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { PageHeader, SectionTitle } from '@/components/ui/gradient-title'
import { Star, Plus, Bell, Heart, Trash2 } from 'lucide-react'
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
      className="glass-card rounded-2xl p-4 card-hover relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/team/${team.id}`} className="flex items-center gap-4">
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
          <h3 className="font-semibold truncate">{team.name}</h3>
          <p className="text-sm text-muted-foreground">{team.league}</p>
        </div>
        <Bell className="w-5 h-5 text-muted-foreground" />
      </Link>

      {/* Remove button */}
      {isHovered && (
        <button
          onClick={(e) => {
            e.preventDefault()
            onRemove()
          }}
          className="absolute top-2 right-2 p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
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
      className="glass-card rounded-2xl p-4 card-hover relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/league/${leagueCode}`} className="flex items-center gap-4">
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
          <h3 className="font-semibold truncate">{league.name}</h3>
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
          className="absolute top-2 right-2 p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
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
      <Header />

      <main className="container mx-auto px-4 pb-12">
        <PageHeader
          title="Favorilerim"
          description="Favori takımlarınız ve liglerinizi buradan takip edin. Bildirimler alın ve maçları kaçırmayın."
          gradient="accent"
          badge={{
            icon: <Heart className="w-4 h-4 text-red-500" />,
            text: 'Favoriler',
          }}
        />

        {/* Favorite Teams */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <SectionTitle gradient="primary">Favori Takımlar</SectionTitle>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
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
            <div className="glass-card rounded-2xl p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                  <Star className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Henüz favori takımınız yok</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Favori takımlarınızı ekleyerek maçlarını takip edin
              </p>
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4" />
                Takım Ekle
              </button>
            </div>
          )}
        </section>

        {/* Favorite Leagues */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <SectionTitle gradient="secondary">Favori Ligler</SectionTitle>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm hover:bg-secondary/90 transition-colors">
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
            <div className="glass-card rounded-2xl p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                  <Star className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Henüz favori liginiz yok</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Favori liglerinizi ekleyerek maçları takip edin
              </p>
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm hover:bg-secondary/90 transition-colors">
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
