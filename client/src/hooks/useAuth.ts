import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export type AuthState = 'idle' | 'checking' | 'polling' | 'authenticated' | 'error';

/**
 * Hook that manages TIDAL OAuth device-linking authentication.
 * States: idle → polling (waiting for user to authorize) → authenticated
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>('idle');
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Run a single check on mount or when returning to idle after logout
    const initCheck = async () => {
      if (authState !== 'idle') return;
      
      try {
        const response = await axios.get(`${API_BASE}/auth/status`, { timeout: 5000 });
        if (!isMounted) return;

        if (response.data.authenticated) {
          setAuthState('authenticated');
        }
      } catch {
        if (!isMounted) return;
        setAuthState('error');
        setAuthError('Unable to connect to server. Please check your connection and try again.');
      }
    };

    initCheck();

    return () => {
      isMounted = false;
    };
  }, [authState]);

  // Handle polling when in 'polling' state
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;

    const pollAuthStatus = async () => {
      try {
        const checkResponse = await axios.get(`${API_BASE}/auth/check`, { timeout: 5000 });
        if (!isMounted) return;

        if (checkResponse.data.completed && checkResponse.data.authenticated) {
          setAuthState('authenticated');
          setLoginUrl(null);
          setUserCode(null);
          setAuthError(null);
        }
      } catch {
        if (!isMounted) return;
        console.error('Auth poll failed', error);
        setAuthError('Unable to connect to server. Please check your connection and try again.');
        setAuthState('error');
      }
    };

    if (authState === 'polling') {
      intervalId = setInterval(pollAuthStatus, 2000);
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [authState]);

  /** Initiate the device-linking OAuth flow */
  const login = async () => {
    setAuthError(null);
    try {
      const response = await axios.get(`${API_BASE}/auth/login`, { timeout: 10000 });
      setLoginUrl(response.data.login_url);
      setUserCode(response.data.user_code || '');
      setAuthState('polling');
    } catch (error) {
      console.error('Failed to initiate login', error);
      setAuthError('Failed to connect to TIDAL. Please try again.');
      setAuthState('error');
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout`, {}, { timeout: 5000 });
      setAuthState('idle');
      setLoginUrl(null);
      setUserCode(null);
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  const cancelLogin = () => {
    setLoginUrl(null);
    setUserCode(null);
    setAuthState('idle');
  };

  return {
    authState,
    setAuthState,
    loginUrl,
    userCode,
    authError,
    setAuthError,
    login,
    logout,
    cancelLogin,
    isAuthenticated: authState === 'authenticated'
  };
}
