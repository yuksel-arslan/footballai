import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, UserProfile } from '@/lib/api'

interface AuthState {
  user: UserProfile | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => void
  refreshAccessToken: () => Promise<void>
  loadProfile: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await api.auth.login({ email, password })
          api.setToken(response.accessToken)
          set({
            user: response.user as UserProfile,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (email: string, password: string, fullName?: string) => {
        set({ isLoading: true })
        try {
          const response = await api.auth.register({ email, password, fullName })
          api.setToken(response.accessToken)
          set({
            user: response.user as UserProfile,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        api.setToken(null)
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get()
        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        try {
          const response = await api.auth.refresh(refreshToken)
          api.setToken(response.accessToken)
          set({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
          })
        } catch {
          // If refresh fails, logout
          get().logout()
          throw new Error('Session expired')
        }
      },

      loadProfile: async () => {
        const { accessToken } = get()
        if (!accessToken) return

        api.setToken(accessToken)
        try {
          const response = await api.user.getProfile()
          set({ user: response.data })
        } catch {
          // Token might be expired, try to refresh
          try {
            await get().refreshAccessToken()
            const response = await api.user.getProfile()
            set({ user: response.data })
          } catch {
            get().logout()
          }
        }
      },

      updateProfile: async (data: Partial<UserProfile>) => {
        const response = await api.user.updateProfile(data)
        set({ user: response.data })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Restore token to API client after rehydration
        if (state?.accessToken) {
          api.setToken(state.accessToken)
        }
      },
    }
  )
)
