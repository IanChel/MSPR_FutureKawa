import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { paysApi } from '../services/api';
import { useAuth } from './AuthContext';

const AlertsContext = createContext({ activeAlertsCount: 0, refreshAlerts: () => {} });

export function AlertsProvider({ children }) {
  const { user } = useAuth();
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);

  const refreshAlerts = useCallback(async () => {
    if (!user) return;
    try {
      const isSuperAdmin = user.roles?.includes('SUPER_ADMIN');
      const data = await paysApi.alertes(isSuperAdmin ? null : (user.pays ?? null));
      setActiveAlertsCount((data || []).filter((a) => a.statut === 'ACTIVE').length);
    } catch {
      // silent — backend indisponible ou token expiré
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setActiveAlertsCount(0);
      return;
    }
    refreshAlerts();
    const interval = setInterval(refreshAlerts, 30000);
    return () => clearInterval(interval);
  }, [refreshAlerts, user]);

  return (
    <AlertsContext.Provider value={{ activeAlertsCount, refreshAlerts }}>
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  return useContext(AlertsContext);
}
