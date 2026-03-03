'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Fixture, League } from '@/lib/api'

interface TeamResult {
  id: number
  name: string
  logoUrl?: string
  code?: string
  league?: string
}

interface LeagueResult {
  id: number
  name: string
  country: string
  logoUrl?: string
  code?: string
}

interface SearchResults {
  teams: TeamResult[]
  leagues: LeagueResult[]
}

export function useSearch(query: string, debounceMs = 300) {
  const [results, setResults] = useState<SearchResults>({ teams: [], leagues: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), debounceMs)
    return () => clearTimeout(timer)
  }, [query, debounceMs])

  // Search
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults({ teams: [], leagues: [] })
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    const searchTeams = fetch(`/api/teams?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
    })
      .then(res => res.ok ? res.json() : { data: [] })
      .then(data => {
        const teams = (data.data || data.matches || data || []) as any[]
        return teams
          .filter((t: any) => t.homeTeam || t.name)
          .slice(0, 8)
          .map((t: any) => {
            if (t.homeTeam) {
              // Fixture result — extract teams
              return [
                { id: t.homeTeam.id, name: t.homeTeam.name, logoUrl: t.homeTeam.logoUrl || t.homeTeam.crest, code: t.homeTeam.code || t.homeTeam.tla, league: t.league?.name },
                { id: t.awayTeam.id, name: t.awayTeam.name, logoUrl: t.awayTeam.logoUrl || t.awayTeam.crest, code: t.awayTeam.code || t.awayTeam.tla, league: t.league?.name },
              ]
            }
            return [{ id: t.id, name: t.name, logoUrl: t.logoUrl || t.crest, code: t.code || t.tla, league: t.league?.name || t.country }]
          })
          .flat()
          .filter((t: TeamResult, i: number, arr: TeamResult[]) =>
            arr.findIndex(x => x.id === t.id) === i
          )
          .filter((t: TeamResult) =>
            t.name.toLowerCase().includes(debouncedQuery.toLowerCase())
          )
          .slice(0, 6) as TeamResult[]
      })
      .catch(() => [] as TeamResult[])

    const searchLeagues = fetch('/api/football?endpoint=/competitions&source=football-data', {
      signal: controller.signal,
    })
      .then(res => res.ok ? res.json() : { competitions: [] })
      .then(data => {
        const competitions = data.competitions || data.data || []
        return competitions
          .filter((l: any) =>
            l.name?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
            l.area?.name?.toLowerCase().includes(debouncedQuery.toLowerCase())
          )
          .slice(0, 6)
          .map((l: any) => ({
            id: l.id,
            name: l.name,
            country: l.area?.name || '',
            logoUrl: l.emblem,
            code: l.code,
          })) as LeagueResult[]
      })
      .catch(() => [] as LeagueResult[])

    Promise.all([searchTeams, searchLeagues])
      .then(([teams, leagues]) => {
        if (!controller.signal.aborted) {
          setResults({ teams, leagues })
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [debouncedQuery])

  return { results, isLoading, query: debouncedQuery }
}
