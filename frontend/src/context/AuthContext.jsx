import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY } from '@/constants';

const AuthContext = createContext(null);
const AUTH_CLEARED_EVENT = 'stocky:auth-cleared';

function getInitialAuthState() {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const userJson = localStorage.getItem(AUTH_USER_STORAGE_KEY);

  if (!token || !userJson) {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return { token: null, user: null };
  }

  try {
    const parsedUser = JSON.parse(userJson);
    if (!parsedUser || parsedUser.id == null) {
      throw new Error('Invalid user payload');
    }

    return {
      token,
      user: parsedUser,
    };
  } catch (error) {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(getInitialAuthState);

  const login = useCallback((token, user) => {
    const normalizedToken = token?.trim();
    if (!normalizedToken) {
      throw new Error('Authentication token is required');
    }

    const nextUser = user ?? null;
    if (!nextUser || nextUser.id == null) {
      throw new Error('Authenticated user details are required');
    }

    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, normalizedToken);
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(nextUser));

    setAuthState({
      token: normalizedToken,
      user: nextUser,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    setAuthState({ token: null, user: null });
  }, []);

  useEffect(() => {
    const clearAuthState = () => setAuthState({ token: null, user: null });
    window.addEventListener(AUTH_CLEARED_EVENT, clearAuthState);
    return () => window.removeEventListener(AUTH_CLEARED_EVENT, clearAuthState);
  }, []);

  const value = useMemo(
    () => ({
      user: authState.user,
      token: authState.token,
      isAuthenticated: Boolean(authState.token && authState.user?.id != null),
      login,
      logout,
    }),
    [authState.user, authState.token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
