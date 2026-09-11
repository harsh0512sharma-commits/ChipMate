import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, getAuthToken, setAuthToken, loadSavedApiBase } from '../api/client';
import { initSocketClient } from '../api/socket';

export interface User {
  id: string;
  phone_number?: string | null;
  email: string;
  display_name: string;
  friend_code: string;
  avatar_url?: string | null;
  stats?: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        await loadSavedApiBase();
        const storedToken = await getAuthToken();
        if (storedToken) {
          setToken(storedToken);
          const res = await apiRequest('/auth/me');
          if (res.success && res.user) {
            setUser(res.user);
            initSocketClient();
          } else {
            await setAuthToken(null);
            setToken(null);
          }
        }
      } catch (err) {
        console.warn('Failed to restore session:', err);
        await setAuthToken(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    await setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
    initSocketClient();
  };

  const logout = async () => {
    await setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    try {
      const res = await apiRequest('/auth/me');
      if (res.success && res.user) {
        setUser(res.user);
      }
    } catch (err) {
      console.warn('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
