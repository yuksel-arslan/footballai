'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useTeamStats(teamId: number, season?: number) {
  return useQuery({
    queryKey: ['stats', 'team', teamId, season],
    queryFn: () => api.stats.getTeamStats(teamId, season),
    enabled: !!teamId,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

export function useTeamForm(teamId: number, last: number = 5) {
  return useQuery({
    queryKey: ['stats', 'form', teamId, last],
    queryFn: () => api.stats.getTeamForm(teamId, last),
    enabled: !!teamId,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

export function useCompareTeams(team1Id: number, team2Id: number) {
  return useQuery({
    queryKey: ['stats', 'compare', team1Id, team2Id],
    queryFn: () => api.stats.compareTeams(team1Id, team2Id),
    enabled: !!team1Id && !!team2Id && team1Id !== team2Id,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

export function useH2H(team1Id: number, team2Id: number) {
  return useQuery({
    queryKey: ['stats', 'h2h', team1Id, team2Id],
    queryFn: () => api.stats.getH2H(team1Id, team2Id),
    enabled: !!team1Id && !!team2Id,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}

export function useStandings(leagueId: number, season?: number) {
  return useQuery({
    queryKey: ['stats', 'standings', leagueId, season],
    queryFn: () => api.stats.getStandings(leagueId, season),
    enabled: !!leagueId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}
