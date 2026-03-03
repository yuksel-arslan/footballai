'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Loader2, Trophy, Users } from 'lucide-react'
import Image from 'next/image'
import { useSearch } from '@/hooks/use-search'
import { useI18n } from '@/lib/i18n'

interface SearchBarProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchBar({ isOpen, onClose }: SearchBarProps) {
  const router = useRouter()
  const { language } = useI18n()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { results, isLoading } = useSearch(query)

  const labels = {
    placeholder: language === 'tr' ? 'Takım veya lig arayın...' : 'Search teams or leagues...',
    teams: language === 'tr' ? 'Takımlar' : 'Teams',
    leagues: language === 'tr' ? 'Ligler' : 'Leagues',
    noResults: language === 'tr' ? 'Sonuç bulunamadı' : 'No results found',
    hint: language === 'tr' ? 'Takım veya lig arayın' : 'Search for a team or league',
  }

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      setQuery('')
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Global Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSelect = (type: 'team' | 'league', id: number, code?: string) => {
    if (type === 'team') {
      router.push(`/teams/${id}`)
    } else {
      router.push(`/league/${code || id}`)
    }
    onClose()
  }

  if (!isOpen) return null

  const hasResults = results.teams.length > 0 || results.leagues.length > 0
  const showEmpty = query.length >= 2 && !isLoading && !hasResults

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-[101]">
        <div className="bg-card rounded-2xl border border-border/50 shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.placeholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {/* Empty state */}
            {query.length < 2 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="w-8 h-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">{labels.hint}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-1">Ctrl+K</p>
              </div>
            )}

            {/* No results */}
            {showEmpty && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">{labels.noResults}</p>
              </div>
            )}

            {/* Teams */}
            {results.teams.length > 0 && (
              <div className="p-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase px-2 py-1 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {labels.teams}
                </p>
                {results.teams.map((team) => (
                  <button
                    key={`team-${team.id}`}
                    onClick={() => handleSelect('team', team.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
                      {team.logoUrl ? (
                        <Image
                          src={team.logoUrl}
                          alt={team.name}
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">
                          {team.code || team.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{team.name}</p>
                      {team.league && (
                        <p className="text-[10px] text-muted-foreground truncate">{team.league}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Leagues */}
            {results.leagues.length > 0 && (
              <div className="p-2 border-t border-border/30">
                <p className="text-[10px] font-medium text-muted-foreground uppercase px-2 py-1 flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  {labels.leagues}
                </p>
                {results.leagues.map((league) => (
                  <button
                    key={`league-${league.id}`}
                    onClick={() => handleSelect('league', league.id, league.code)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
                      {league.logoUrl ? (
                        <Image
                          src={league.logoUrl}
                          alt={league.name}
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                      ) : (
                        <Trophy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{league.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{league.country}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground/50">
            <span>ESC {language === 'tr' ? 'kapat' : 'close'}</span>
            <span>{language === 'tr' ? 'Ara' : 'Search'}</span>
          </div>
        </div>
      </div>
    </>
  )
}
