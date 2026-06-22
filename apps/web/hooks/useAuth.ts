'use client';

import { useCallback, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  nome: string;
  role: string;
  cpf?: string;
  telefone?: string;
  exp: number;
  iat: number;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  setUser: (user: User | null) => void;
}

/**
 * useAuth Hook: Manages authentication state and JWT token
 *
 * Features:
 * - Loads user from localStorage on mount
 * - Validates JWT token expiry
 * - Auto-refresh token if expired
 * - Logout functionality
 * - Persistent across page reloads
 *
 * Usage:
 * const { user, loading, isAuthenticated, logout } = useAuth();
 * if (loading) return <Skeleton />;
 * if (!isAuthenticated) return <Redirect to="/login" />;
 * return <Dashboard user={user} onLogout={logout} />;
 */
export function useAuth(): UseAuthReturn {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Decode JWT token
  const decodeJwt = useCallback((token: string): User | null => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = parts[1];
      const decoded = JSON.parse(
        Buffer.from(
          payload.replace(/-/g, '+').replace(/_/g, '/'),
          'base64'
        ).toString('utf-8')
      );

      return decoded as User;
    } catch (e) {
      console.error('[useAuth] Failed to decode JWT:', e);
      return null;
    }
  }, []);

  // Check if token is expired
  const isTokenExpired = useCallback((token: string | null): boolean => {
    if (!token) return true;

    const user = decodeJwt(token);
    if (!user || !user.exp) return true;

    // Token expires in X seconds, check if exp < now
    const expiresAt = user.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // Refresh if less than 2 minutes remaining
    return timeUntilExpiry < 2 * 60 * 1000;
  }, [decodeJwt]);

  // Refresh token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        setIsAuthenticated(false);
        setUserState(null);
        return false;
      }

      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        // Refresh failed, clear auth
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setIsAuthenticated(false);
        setUserState(null);
        return false;
      }

      const data = await res.json();
      localStorage.setItem('access_token', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refresh_token', data.refreshToken);
      }

      const decoded = decodeJwt(data.accessToken);
      if (decoded) {
        setUserState(decoded);
        setIsAuthenticated(true);
        return true;
      }

      return false;
    } catch (e) {
      console.error('[useAuth] Token refresh failed:', e);
      setIsAuthenticated(false);
      setUserState(null);
      return false;
    }
  }, [decodeJwt]);

  // Load user on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setLoading(false);
      setIsAuthenticated(false);
      return;
    }

    // Token exists, validate it
    const decoded = decodeJwt(token);
    if (!decoded) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setLoading(false);
      setIsAuthenticated(false);
      return;
    }

    // Check if expired
    if (isTokenExpired(token)) {
      // Try to refresh
      refreshToken().then((success) => {
        setLoading(false);
      });
    } else {
      setUserState(decoded);
      setIsAuthenticated(true);
      setLoading(false);
    }
  }, [decodeJwt, isTokenExpired, refreshToken]);

  // Setup periodic token refresh (refresh 1 minute before expiry)
  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const expiresAt = user.exp * 1000;
    const now = Date.now();
    const refreshAt = expiresAt - 60 * 1000; // 1 minute before expiry
    const timeUntilRefresh = refreshAt - now;

    if (timeUntilRefresh <= 0) {
      refreshToken();
      return;
    }

    const timer = setTimeout(() => {
      refreshToken();
    }, timeUntilRefresh);

    return () => clearTimeout(timer);
  }, [user, isAuthenticated, refreshToken]);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUserState(null);
    setIsAuthenticated(false);

    // Optional: Call backend logout endpoint
    fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {
      // Ignore errors, user is already logged out locally
    });

    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login?session=expired';
    }
  }, []);

  // Update user state
  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      setIsAuthenticated(true);
    }
  }, []);

  return {
    user,
    loading,
    isAuthenticated,
    logout,
    refreshToken,
    setUser,
  };
}

/**
 * Higher-order component for protecting pages
 * Usage: <ProtectedPage user={user} isAuthenticated={isAuthenticated} fallback={<Spinner />}>
 *   Content here
 * </ProtectedPage>
 */
export function ProtectedContent({
  isAuthenticated,
  loading,
  fallback,
  children,
}: {
  isAuthenticated: boolean;
  loading: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (loading) {
    return fallback || <div>Carregando...</div>;
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  return <>{children}</>;
}
