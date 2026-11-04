import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/endpoints.js';
import { getStoredToken, setToken, SIGN_OUT_EVENT } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getStoredToken()));

  // Restore the session on refresh: the token alone is not enough to know the
  // role, so ask the API who it belongs to before rendering any route.
  useEffect(() => {
    if (!getStoredToken()) return;
    let cancelled = false;
    authApi
      .me()
      .then((profile) => !cancelled && setUser(profile))
      .catch(() => !cancelled && setToken(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const handler = () => signOut();
    window.addEventListener(SIGN_OUT_EVENT, handler);
    return () => window.removeEventListener(SIGN_OUT_EVENT, handler);
  }, [signOut]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      role: user?.role || null,
      async login(credentials) {
        const { token, user: profile } = await authApi.login(credentials);
        setToken(token);
        setUser(profile);
        return profile;
      },
      async register(payload) {
        const { token, user: profile } = await authApi.register(payload);
        setToken(token);
        setUser(profile);
        return profile;
      },
      async refreshUser() {
        const profile = await authApi.me();
        setUser(profile);
        return profile;
      },
      updateUser: setUser,
      signOut,
    }),
    [user, loading, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
