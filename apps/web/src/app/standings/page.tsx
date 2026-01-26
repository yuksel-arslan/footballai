'use client'

import { useState } from 'react'
import { ChevronDown, Key, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { LEAGUES, COUNTRY_FLAGS, type Standing, ApiConfigError } from '@/lib/api'
import { useStandings } from '@/hooks/use-fixtures'

const leagueList = Object.entries(LEAGUES).map(([code, league]) => ({
  code,
  ...league,
  flag: COUNTRY_FLAGS[league.countryCode || ''] || '',
}))

function FormBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  const styles = {
    W: { bg: '#10B981', shadow: 'rgba(16, 185, 129, 0.5)' },
    D: { bg: '#FBBF24', shadow: 'rgba(251, 191, 36, 0.5)' },
    L: { bg: '#EF4444', shadow: 'rgba(239, 68, 68, 0.5)' },
  }

  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center"
      style={{
        background: styles[result].bg,
        boxShadow: `0 0 10px ${styles[result].shadow}`
      }}
    >
      <span className="text-xs font-bold text-white">{result}</span>
    </div>
  )
}

function TeamRow({ standing, isTop4, isRelegation }: { standing: Standing; isTop4: boolean; isRelegation: boolean }) {
  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-[#0EA5E9]/5 transition-all ${
      isTop4 ? 'border-l-4 border-[#10B981]' : isRelegation ? 'border-l-4 border-[#EF4444]' : ''
    }`}>
        {/* Position */}
        <span
          className="w-8 text-center font-bold"
          style={{
            color: isTop4 ? '#10B981' : isRelegation ? '#EF4444' : undefined,
            textShadow: isTop4 ? '0 0 10px rgba(16, 185, 129, 0.5)' : isRelegation ? '0 0 10px rgba(239, 68, 68, 0.5)' : undefined
          }}
        >
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
          <span className="font-medium truncate group-hover:text-[#0EA5E9] transition-colors">{standing.team.name}</span>
        </div>

        {/* Stats - Desktop */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <span className="w-10 text-center text-muted-foreground">{standing.played}</span>
          <span className="w-10 text-center text-[#10B981]">{standing.won}</span>
          <span className="w-10 text-center text-[#FBBF24]">{standing.drawn}</span>
          <span className="w-10 text-center text-[#EF4444]">{standing.lost}</span>
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
        <span
          className="w-12 text-right font-bold text-lg text-[#0EA5E9]"
          style={{ textShadow: '0 0 10px rgba(14, 165, 233, 0.3)' }}
        >
          {standing.points}
        </span>
      </div>
  )
}

function ApiKeyMissingState() {
  return (
    <div className="neon-card rounded-2xl p-8 text-center border border-[#FBBF24]/30 bg-[#FBBF24]/5">
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 rounded-full bg-[#FBBF24]/20 flex items-center justify-center">
          <Key className="w-7 h-7 text-[#FBBF24]" />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-2 text-[#FBBF24]">
        API Anahtarı Gerekli
      </h3>
      <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
        Puan durumunu görmek için bir API anahtarı yapılandırmanız gerekiyor.
      </p>
      <div className="bg-card/50 rounded-lg p-4 text-left max-w-md mx-auto">
        <p className="text-xs text-muted-foreground mb-2">
          <code className="bg-muted px-1 rounded">.env.local</code> dosyasına ekleyin:
        </p>
        <code className="text-xs text-[#0EA5E9] block">
          NEXT_PUBLIC_FOOTBALL_DATA_KEY=your_key
        </code>
        <p className="text-xs text-muted-foreground mt-3">
          Ücretsiz API key:{' '}
          <a
            href="https://www.football-data.org/client/register"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0EA5E9] hover:underline"
          >
            football-data.org
          </a>
        </p>
      </div>
    </div>
  )
}

export default function StandingsPage() {
  const [selectedLeague, setSelectedLeague] = useState(leagueList[0])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const { data: standings = [], isLoading, isError, error } = useStandings(selectedLeague.code)

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-3 sm:px-4 pb-8">
        {/* Page Header */}
        <div className="py-4 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] bg-clip-text text-transparent">
            Puan Durumu
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Güncel lig tabloları ve sıralamalar</p>
        </div>

        {/* League Selector */}
        <div className="mb-6">
          <div className="relative inline-block">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 px-6 py-3 rounded-xl glass-card hover:bg-muted/50 transition-all border border-[#FBBF24]/20 hover:border-[#FBBF24]/40 hover:shadow-neon-gold"
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
              <div className="absolute left-0 top-full mt-2 w-72 py-2 rounded-2xl bg-popover border border-[#0EA5E9]/20 shadow-xl z-50">
                {leagueList.map((league) => (
                  <button
                    key={league.code}
                    onClick={() => {
                      setSelectedLeague(league)
                      setIsDropdownOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#0EA5E9]/10 transition-colors ${
                      selectedLeague.code === league.code ? 'bg-[#0EA5E9]/10 border-l-2 border-[#0EA5E9]' : ''
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

        {/* Content */}
        {isError && (error instanceof ApiConfigError || error?.message?.includes('API anahtarı')) ? (
          <ApiKeyMissingState />
        ) : isLoading ? (
          <div className="neon-card rounded-2xl p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0EA5E9]" />
            <p className="text-muted-foreground mt-4">Yükleniyor...</p>
          </div>
        ) : (
          <div className="neon-card rounded-2xl overflow-hidden">
            {/* Header */}
            <div
              className="flex items-center gap-4 px-4 py-3 border-b border-[#0EA5E9]/10 text-xs font-medium text-muted-foreground uppercase"
              style={{ background: 'linear-gradient(180deg, rgba(14, 165, 233, 0.05), transparent)' }}
            >
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
            <div className="px-4 py-3 border-t border-[#0EA5E9]/10 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#10B981]" style={{ boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)' }} />
                <span className="text-muted-foreground">Şampiyonlar Ligi</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#EF4444]" style={{ boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)' }} />
                <span className="text-muted-foreground">Küme Düşme</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
