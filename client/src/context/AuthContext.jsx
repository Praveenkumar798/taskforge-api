import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Try to restore session on mount
  useEffect(() => {
    const tryRefresh = async () => {
      const refreshed = await api.refreshToken();
      if (refreshed) {
        const { ok, data } = await api.getMe();
        if (ok) setUser(data.user);
      }
      setLoading(false);
    };
    tryRefresh();
  }, []);

  const login = useCallback(async (email, password) => {
    const { ok, data } = await api.login({ email, password });
    if (ok) {
      api.setToken(data.accessToken);
      setUser(data.user);
    }
    return { ok, data };
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { ok, data } = await api.register({ name, email, password });
    if (ok) {
      api.setToken(data.accessToken);
      setUser(data.user);
    }
    return { ok, data };
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    api.clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
