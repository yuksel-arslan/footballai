'use client'

import { useState } from 'react'
import { Star, Plus, Bell, Trash2, X, Search } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { LEAGUES, COUNTRY_FLAGS, getAllLeagues } from '@/lib/api'
import { useI18n } from '@/lib/i18n'

// Available teams for selection (sample teams from different leagues)
const AVAILABLE_TEAMS = [
  { id: '64', name: 'Liverpool', code: 'LIV', logoUrl: 'https://crests.football-data.org/64.png', league: 'Premier League', leagueCode: 'PL' },
  { id: '65', name: 'Manchester City', code: 'MCI', logoUrl: 'https://crests.football-data.org/65.png', league: 'Premier League', leagueCode: 'PL' },
  { id: '57', name: 'Arsenal', code: 'ARS', logoUrl: 'https://crests.football-data.org/57.png', league: 'Premier League', leagueCode: 'PL' },
  { id: '61', name: 'Chelsea', code: 'CHE', logoUrl: 'https://crests.football-data.org/61.png', league: 'Premier League', leagueCode: 'PL' },
  { id: '66', name: 'Manchester United', code: 'MUN', logoUrl: 'https://crests.football-data.org/66.png', league: 'Premier League', leagueCode: 'PL' },
  { id: '86', name: 'Real Madrid', code: 'RMA', logoUrl: 'https://crests.football-data.org/86.png', league: 'La Liga', leagueCode: 'PD' },
  { id: '81', name: 'Barcelona', code: 'BAR', logoUrl: 'https://crests.football-data.org/81.png', league: 'La Liga', leagueCode: 'PD' },
  { id: '78', name: 'Atletico Madrid', code: 'ATM', logoUrl: 'https://crests.football-data.org/78.png', league: 'La Liga', leagueCode: 'PD' },
  { id: '5', name: 'Bayern Munich', code: 'BAY', logoUrl: 'https://crests.football-data.org/5.png', league: 'Bundesliga', leagueCode: 'BL1' },
  { id: '4', name: 'Borussia Dortmund', code: 'BVB', logoUrl: 'https://crests.football-data.org/4.png', league: 'Bundesliga', leagueCode: 'BL1' },
  { id: '109', name: 'Juventus', code: 'JUV', logoUrl: 'https://crests.football-data.org/109.png', league: 'Serie A', leagueCode: 'SA' },
  { id: '108', name: 'Inter Milan', code: 'INT', logoUrl: 'https://crests.football-data.org/108.png', league: 'Serie A', leagueCode: 'SA' },
  { id: '98', name: 'AC Milan', code: 'ACM', logoUrl: 'https://crests.football-data.org/98.png', league: 'Serie A', leagueCode: 'SA' },
  { id: '524', name: 'Paris Saint-Germain', code: 'PSG', logoUrl: 'https://crests.football-data.org/524.png', league: 'Ligue 1', leagueCode: 'FL1' },
  { id: '610', name: 'Galatasaray', code: 'GS', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Galatasaray_Sports_Club_Logo.png', league: 'Süper Lig', leagueCode: 'TSL' },
  { id: '611', name: 'Fenerbahçe', code: 'FB', logoUrl: 'https://upload.wikimedia.org/wikipedia/tr/8/86/Fenerbah%C3%A7e_SK.png', league: 'Süper Lig', leagueCode: 'TSL' },
  { id: '612', name: 'Beşiktaş', code: 'BJK', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Be%C5%9Fikta%C5%9F_Logo_Be%C5%9Fikta%C5%9F_Amblem_Be%C5%9Fikta%C5%9F_Arma.png', league: 'Süper Lig', leagueCode: 'TSL' },
]

// Mock favorite teams
const initialFavoriteTeams = [
  { id: '64', name: 'Liverpool', code: 'LIV', logoUrl: 'https://crests.football-data.org/64.png', league: 'Premier League', leagueCode: 'PL' },
  { id: '610', name: 'Galatasaray', code: 'GS', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Galatasaray_Sports_Club_Logo.png', league: 'Süper Lig', leagueCode: 'TSL' },
  { id: '86', name: 'Real Madrid', code: 'RMA', logoUrl: 'https://crests.football-data.org/86.png', league: 'La Liga', leagueCode: 'PD' },
]

// Mock favorite leagues
const initialFavoriteLeagues = ['PL', 'TSL', 'CL']

interface TeamType {
  id: string
  name: string
  code: string
  logoUrl: string
  league: string
  leagueCode: string
}

interface FavoriteTeamCardProps {
  team: TeamType
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
  const [imageError, setImageError] = useState(false)

  if (!league) return null

  return (
    <div
      className="neon-card rounded-2xl p-4 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/league/${leagueCode}`} className="flex items-center gap-4 group">
        <span className="text-3xl">{flag}</span>
        {league.logoUrl && !imageError ? (
          <Image
            src={league.logoUrl}
            alt={league.name}
            width={40}
            height={40}
            className="object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
            {league.name.charAt(0)}
          </div>
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

// Add Team Modal
function AddTeamModal({
  isOpen,
  onClose,
  onAdd,
  existingTeamIds,
  t
}: {
  isOpen: boolean
  onClose: () => void
  onAdd: (team: TeamType) => void
  existingTeamIds: string[]
  t: ReturnType<typeof useI18n>['t']
}) {
  const [search, setSearch] = useState('')
  const { language } = useI18n()

  if (!isOpen) return null

  const availableTeams = AVAILABLE_TEAMS.filter(
    team => !existingTeamIds.includes(team.id) &&
    (team.name.toLowerCase().includes(search.toLowerCase()) ||
     team.league.toLowerCase().includes(search.toLowerCase()))
  )

  const searchPlaceholder = language === 'tr' ? 'Takım ara...' : language === 'de' ? 'Team suchen...' : language === 'es' ? 'Buscar equipo...' : language === 'it' ? 'Cerca squadra...' : language === 'fr' ? 'Rechercher équipe...' : 'Search team...'

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-lg mx-auto">
        <div className="glass-card rounded-2xl p-4 sm:p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">
              {t.favorites.addTeam}
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card focus:outline-none focus:border-[#0EA5E9] transition-colors"
            />
          </div>

          {/* Team List */}
          <div className="max-h-80 overflow-y-auto space-y-2">
            {availableTeams.length > 0 ? (
              availableTeams.map(team => (
                <button
                  key={team.id}
                  onClick={() => {
                    onAdd(team)
                    onClose()
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <Image
                    src={team.logoUrl}
                    alt={team.name}
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                  <div className="flex-1 text-left">
                    <p className="font-medium">{team.name}</p>
                    <p className="text-sm text-muted-foreground">{team.league}</p>
                  </div>
                  <Plus className="w-5 h-5 text-[#0EA5E9]" />
                </button>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {language === 'tr' ? 'Takım bulunamadı' : language === 'de' ? 'Kein Team gefunden' : language === 'es' ? 'Equipo no encontrado' : language === 'it' ? 'Squadra non trovata' : language === 'fr' ? 'Équipe non trouvée' : 'No team found'}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// Add League Modal
function AddLeagueModal({
  isOpen,
  onClose,
  onAdd,
  existingLeagueCodes,
  t
}: {
  isOpen: boolean
  onClose: () => void
  onAdd: (leagueCode: string) => void
  existingLeagueCodes: string[]
  t: ReturnType<typeof useI18n>['t']
}) {
  const { language } = useI18n()
  const allLeagues = getAllLeagues()

  if (!isOpen) return null

  const availableLeagues = allLeagues.filter(
    league => !existingLeagueCodes.includes(Object.keys(LEAGUES).find(key => LEAGUES[key].id === league.id) || '')
  )

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-lg mx-auto">
        <div className="glass-card rounded-2xl p-4 sm:p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-[#0EA5E9] to-[#10B981] bg-clip-text text-transparent">
              {t.favorites.addLeague}
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* League List */}
          <div className="max-h-80 overflow-y-auto space-y-2">
            {availableLeagues.length > 0 ? (
              availableLeagues.map(league => {
                const leagueCode = Object.keys(LEAGUES).find(key => LEAGUES[key].id === league.id) || ''
                const flag = COUNTRY_FLAGS[league.countryCode || ''] || ''
                return (
                  <button
                    key={league.id}
                    onClick={() => {
                      onAdd(leagueCode)
                      onClose()
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-2xl">{flag}</span>
                    {league.logoUrl && (
                      <Image
                        src={league.logoUrl}
                        alt={league.name}
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium">{league.name}</p>
                      <p className="text-sm text-muted-foreground">{league.country}</p>
                    </div>
                    <Plus className="w-5 h-5 text-[#10B981]" />
                  </button>
                )
              })
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {language === 'tr' ? 'Tüm ligler eklendi' : language === 'de' ? 'Alle Ligen hinzugefügt' : language === 'es' ? 'Todas las ligas añadidas' : language === 'it' ? 'Tutti i campionati aggiunti' : language === 'fr' ? 'Tous les championnats ajoutés' : 'All leagues added'}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function FavoritesPage() {
  const [favoriteTeams, setFavoriteTeams] = useState<TeamType[]>(initialFavoriteTeams)
  const [favoriteLeagues, setFavoriteLeagues] = useState(initialFavoriteLeagues)
  const [showAddTeamModal, setShowAddTeamModal] = useState(false)
  const [showAddLeagueModal, setShowAddLeagueModal] = useState(false)
  const { t } = useI18n()

  const removeTeam = (id: string) => {
    setFavoriteTeams(teams => teams.filter(t => t.id !== id))
  }

  const removeLeague = (code: string) => {
    setFavoriteLeagues(leagues => leagues.filter(l => l !== code))
  }

  const addTeam = (team: TeamType) => {
    setFavoriteTeams(teams => [...teams, team])
  }

  const addLeague = (code: string) => {
    setFavoriteLeagues(leagues => [...leagues, code])
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-3 sm:px-4 pb-8">
        {/* Page Header */}
        <div className="py-4 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] bg-clip-text text-transparent">
            {t.favorites.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t.favorites.subtitle}</p>
        </div>

        {/* Favorite Teams */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">
              {t.favorites.favoriteTeams}
            </h2>
            <button
              onClick={() => setShowAddTeamModal(true)}
              className="btn-neon flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              {t.favorites.addTeam}
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
              <h3 className="text-lg font-semibold mb-2">{t.favorites.noTeams}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {t.favorites.noTeamsDesc}
              </p>
              <button
                onClick={() => setShowAddTeamModal(true)}
                className="btn-neon inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                {t.favorites.addTeam}
              </button>
            </div>
          )}
        </section>

        {/* Favorite Leagues */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-[#0EA5E9] to-[#10B981] bg-clip-text text-transparent">
              {t.favorites.favoriteLeagues}
            </h2>
            <button
              onClick={() => setShowAddLeagueModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm text-white"
              style={{
                background: 'linear-gradient(135deg, #0EA5E9, #10B981)',
                boxShadow: '0 0 20px rgba(14, 165, 233, 0.4)'
              }}
            >
              <Plus className="w-4 h-4" />
              {t.favorites.addLeague}
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
              <h3 className="text-lg font-semibold mb-2">{t.favorites.noLeagues}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {t.favorites.noLeaguesDesc}
              </p>
              <button
                onClick={() => setShowAddLeagueModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm text-white"
                style={{
                  background: 'linear-gradient(135deg, #0EA5E9, #10B981)',
                  boxShadow: '0 0 20px rgba(14, 165, 233, 0.4)'
                }}
              >
                <Plus className="w-4 h-4" />
                {t.favorites.addLeague}
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Modals */}
      <AddTeamModal
        isOpen={showAddTeamModal}
        onClose={() => setShowAddTeamModal(false)}
        onAdd={addTeam}
        existingTeamIds={favoriteTeams.map(t => t.id)}
        t={t}
      />
      <AddLeagueModal
        isOpen={showAddLeagueModal}
        onClose={() => setShowAddLeagueModal(false)}
        onAdd={addLeague}
        existingLeagueCodes={favoriteLeagues}
        t={t}
      />
    </div>
  )
}
