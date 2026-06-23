import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser as fetchCurrentUser, logout as clearToken } from '@/lib/api';

const AuthContext = createContext(null);

const localUser = {
  id: 'local-user',
  email: 'local@example.com',
  full_name: 'Local User',
  role: import.meta.env.VITE_LOCAL_ROLE || 'admin',
};

async function getCurrentUser() {
  if (import.meta.env.VITE_LOCAL_AUTH === 'true') return localUser;
  return fetchCurrentUser();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const current = await getCurrentUser();
      setUser(current || null);
    } catch (error) {
      setUser(null);
      setAuthError(error);
    } finally {
      setAuthChecked(true);
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth]);

  const logout = useCallback(async () => {
    clearToken();
    setUser(null);
    window.location.href = '/login';
  }, []);

  const navigateToLogin = useCallback(() => {
    window.location.href = '/login';
  }, []);

  const value = useMemo(() => ({
    user,
    currentUser: user,
    isAuthenticated: !!user,
    isLoadingAuth,
    authChecked,
    authError,
    checkUserAuth,
    logout,
    navigateToLogin,
  }), [user, isLoadingAuth, authChecked, authError, checkUserAuth, logout, navigateToLogin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
