'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Profile {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  isAdmin: boolean
  emailVerified: boolean
  twoFactorEnabled: boolean
  preferredLang: string
  theme: string
  createdAt: string
  lastLoginAt: string | null
}

interface UpdateProfileInput {
  name?: string
  email?: string
  preferredLang?: string
  theme?: string
}

async function fetchProfile(): Promise<Profile> {
  const res = await fetch('/api/profile')
  if (!res.ok) throw new Error('Failed to fetch profile')
  const data = await res.json()
  return data.data || data
}

async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  const res = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Failed to update profile')
  const data = await res.json()
  return data.data || data
}

export function useProfile() {
  return useQuery<Profile>({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}
