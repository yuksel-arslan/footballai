'use client'

import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api'

export function useAuth() {
  const store = useAuthStore()
  const queryClient = useQueryClient()

  // Load profile on mount if authenticated
  useEffect(() => {
    if (store.isAuthenticated && !store.user) {
      store.loadProfile()
    }
  }, [store.isAuthenticated])

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    login: store.login,
    register: store.register,
    logout: () => {
      store.logout()
      queryClient.clear()
    },
    updateProfile: store.updateProfile,
  }
}

export function useFavoriteTeams() {
  const { isAuthenticated } = useAuthStore()

  return useQuery({
    queryKey: ['favorites', 'teams'],
    queryFn: () => api.user.getFavoriteTeams(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useFavoriteLeagues() {
  const { isAuthenticated } = useAuthStore()

  return useQuery({
    queryKey: ['favorites', 'leagues'],
    queryFn: () => api.user.getFavoriteLeagues(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useAddFavoriteTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (teamId: number) => api.user.addFavoriteTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', 'teams'] })
    },
  })
}

export function useRemoveFavoriteTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (teamId: number) => api.user.removeFavoriteTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', 'teams'] })
    },
  })
}

export function useNotifications(limit?: number, unreadOnly?: boolean) {
  const { isAuthenticated } = useAuthStore()

  return useQuery({
    queryKey: ['notifications', { limit, unreadOnly }],
    queryFn: () => api.user.getNotifications(limit, unreadOnly),
    enabled: isAuthenticated,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  })
}
