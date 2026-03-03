import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export type AuthState = 'idle' | 'checking' | 'polling' | 'authenticated' | 'error';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>('idle');
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;

    const checkAuthStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE}/auth/status`, { timeout: 5000 });
        if (!isMounted) return;
        
        if (response.data.authenticated) {
          setAuthState('authenticated');
          setLoginUrl(null);
          setUserCode(null);
          setAuthError(null);
        } else if (authState === 'polling') {
          const checkResponse = await axios.get(`${API_BASE}/auth/check`, { timeout: 5000 });
          if (!isMounted) return;
          
          if (checkResponse.data.completed && checkResponse.data.authenticated) {
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
