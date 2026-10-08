import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { hotelApi } from '../api/hotelApi';

const AuthContext = createContext(null);

const TOKEN_KEY = 'voyage_token';
const USER_KEY = 'voyage_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Verify stored token on initial load
  useEffect(() => {
    async function checkAuth() {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const profile = await hotelApi.getMe();
        setUser(profile);
        localStorage.setItem(USER_KEY, JSON.stringify(profile));
      } catch (err) {
        console.warn('Session expired or invalid:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [logout]);

  // Listen for global 401 unauthorized events from API client
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('voyage_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('voyage_unauthorized', handleUnauthorized);
  }, [logout]);

  const login = async (username, password) => {
    const data = await hotelApi.login({ username, password });
    if (data.access_token && data.user) {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    }
    throw new Error('Authentication response missing credentials');
  };

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
