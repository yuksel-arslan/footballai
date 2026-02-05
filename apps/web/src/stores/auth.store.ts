import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  clearUser: () => void;
}

/**
 * Auth store with persistence
 */
export const useAuthStore = create<AuthState>()(n  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      
      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },
      
      clearUser: () => {
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage', // localStorage key
    }
  )
);
