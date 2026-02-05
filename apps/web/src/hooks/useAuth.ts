import { useState } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser, clearUser } = useAuthStore();

  /**
   * Register new user
   */
  const register = async (input: RegisterInput): Promise<User | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{ success: boolean; data: AuthResponse }>(
        '/api/auth/register',
        input
      );

      if (response.data.success) {
        const { user, token } = response.data.data;
        
        // Save token
        apiClient.setToken(token);
        
        // Update store
        setUser(user);

        return user;
      }

      return null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Kayıt başarısız oldu';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login user
   */
  const login = async (input: LoginInput): Promise<User | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{ success: boolean; data: AuthResponse }>(
        '/api/auth/login',
        input
      );

      if (response.data.success) {
        const { user, token } = response.data.data;
        
        // Save token
        apiClient.setToken(token);
        
        // Update store
        setUser(user);

        return user;
      }

      return null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Giriş başarısız oldu';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout user
   */
  const logout = () => {
    apiClient.clearToken();
    clearUser();
  };

  /**
   * Get current user
   */
  const getCurrentUser = async (): Promise<User | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{ success: boolean; data: { user: User } }>(
        '/api/auth/me'
      );

      if (response.data.success) {
        const user = response.data.data.user;
        setUser(user);
        return user;
      }

      return null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Kullanıcı bilgisi alınamadı';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    register,
    login,
    logout,
    getCurrentUser,
    isLoading,
    error,
  };
};
