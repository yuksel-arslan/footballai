'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export interface User {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  isAdmin: boolean
  emailVerified: boolean
  twoFactorEnabled: boolean
  preferredLang: string
  theme: string
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')

      if (!res.ok) {
        setState({ user: null, loading: false, error: null })
        return
      }

      const data = await res.json()
      setState({ user: data.user, loading: false, error: null })
    } catch {
      setState({ user: null, loading: false, error: 'Failed to fetch user' })
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = async (email: string, password: string) => {
    setState(s => ({ ...s, loading: true, error: null }))

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setState(s => ({ ...s, loading: false, error: data.error }))
        return { success: false, error: data.error, requires2FA: false }
      }

      if (data.requires2FA) {
        setState(s => ({ ...s, loading: false }))
        return { success: false, error: null, requires2FA: true, userId: data.userId }
      }

      setState({ user: data.user, loading: false, error: null })
      return { success: true, error: null, requires2FA: false }
    } catch {
      setState(s => ({ ...s, loading: false, error: 'Login failed' }))
      return { success: false, error: 'Login failed', requires2FA: false }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setState({ user: null, loading: false, error: null })
      router.push('/login')
      router.refresh()
    } catch {
      // Still clear state even if API fails
      setState({ user: null, loading: false, error: null })
      router.push('/login')
    }
  }

  const register = async (email: string, password: string, fullName?: string) => {
    setState(s => ({ ...s, loading: true, error: null }))

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      })

      const data = await res.json()

      if (!res.ok) {
        setState(s => ({ ...s, loading: false, error: data.error }))
        return { success: false, error: data.error }
      }

      setState({ user: data.user, loading: false, error: null })
      return { success: true, error: null }
    } catch {
      setState(s => ({ ...s, loading: false, error: 'Registration failed' }))
      return { success: false, error: 'Registration failed' }
    }
  }

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user,
    isAdmin: state.user?.isAdmin || false,
    login,
    logout,
    register,
    refetch: fetchUser,
  }
}
