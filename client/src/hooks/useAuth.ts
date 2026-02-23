import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api';
import type { AuthState } from '../types';

export interface UseAuthReturn {
  isAuthenticated: boolean;
  authState: AuthState;
  loginUrl: string | null;
  userCode: string | null;
  authError: string | null;
  handleLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;
  handleCancelLogin: () => void;
  clearAuthError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [authState, setAuthState] = useState<AuthState>('idle');
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;

    const checkAuthStatus = async () => {
      try {
        const response = await authApi.getStatus();
        if (!isMounted) return;

        if (response.authenticated) {
          setAuthState('authenticated');
          setLoginUrl(null);
          setUserCode(null);
          setAuthError(null);
        } else if (authState === 'polling') {
          const checkResponse = await authApi.check();
          if (!isMounted) return;

          if (checkResponse.completed && checkResponse.authenticated) {
            setAuthState('authenticated');
            setLoginUrl(null);
            setUserCode(null);
            setAuthError(null);
          }
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Auth check failed', error);
        if (authState !== 'polling') {
          setAuthError('Unable to connect to server. Please ensure the backend is running.');
          setAuthState('error');
        }
      }
    };

    checkAuthStatus();

    if (authState === 'polling') {
      intervalId = setInterval(checkAuthStatus, 2000);
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [authState]);

  const handleLogin = useCallback(async () => {
    setAuthError(null);
    try {
      const response = await authApi.login();
      setLoginUrl(response.login_url);
      setUserCode(response.user_code || '');
      setAuthState('polling');
    } catch (error) {
      console.error('Failed to initiate login', error);
      setAuthError('Failed to connect to TIDAL. Please try again.');
      setAuthState('error');
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
      setAuthState('idle');
      setLoginUrl(null);
      setUserCode(null);
    } catch (error) {
      console.error('Failed to logout', error);
    }
  }, []);

  const handleCancelLogin = useCallback(() => {
    setLoginUrl(null);
    setUserCode(null);
    setAuthState('idle');
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  return {
    isAuthenticated: authState === 'authenticated',
    authState,
    loginUrl,
    userCode,
    authError,
    handleLogin,
    handleLogout,
    handleCancelLogin,
    clearAuthError,
  };
}
