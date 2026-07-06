import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, setTokens, clearTokens, getAccessToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getAccessToken()) {
      authApi.me()
        .then(setUser)
        .catch(() => {
          clearTokens();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    setTokens(data.accessToken, data.refreshToken);
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}

export function userInitials(user) {
  if (!user) return 'U';
  const parts = [user.prenom, user.nom].filter(Boolean);
  if (parts.length === 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (user.email) return user.email[0].toUpperCase();
  return 'U';
}

export function userDisplayName(user) {
  if (!user) return '';
  const parts = [user.prenom, user.nom].filter(Boolean);
  return parts.join(' ') || user.email;
}

export function userRoleLabel(user) {
  if (!user) return '';
  const roles = user.roles || [];
  if (roles.includes('SUPER_ADMIN')) return 'Siège · tous pays';
  if (roles.includes('ADMIN_PAYS')) return `Administrateur · ${pays(user.pays)}`;
  if (roles.includes('OPERATEUR')) return `Opérateur · ${pays(user.pays)}`;
  return `Lecteur · ${pays(user.pays)}`;
}

function pays(code) {
  const map = { BRESIL: 'Brésil', EQUATEUR: 'Équateur', COLOMBIE: 'Colombie' };
  return map[code] || code || '';
}
