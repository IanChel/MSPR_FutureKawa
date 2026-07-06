import React, { useMemo, useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { paysApi, toBackendCode, formatDate } from '../services/api';

const COUNTRY_TABS = [
  { id: 'all', label: 'Tous' },
  { id: 'brazil', label: 'Brésil' },
  { id: 'ecuador', label: 'Équateur' },
  { id: 'colombia', label: 'Colombie' },
];

function Badge({ children, tone = 'default' }) {
  const styles =
    tone === 'danger'
      ? 'bg-rose-50 text-rose-700 border border-rose-200'
      : tone === 'warn'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : tone === 'ok'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : tone === 'info'
      ? 'bg-sky-50 text-sky-700 border border-sky-200'
      : 'bg-slate-100 text-slate-700 border border-slate-200';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
      {children}
    </span>
  );
}

function FilterChip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-slate-900 text-white'
          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-1 pb-3 pt-1 text-sm font-semibold transition ${
        active
          ? 'border-emerald-600 text-emerald-700'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-emerald-600 animate-spin" />
    </div>
  );
}

export default function AlertsPage() {
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedTab, setSelectedTab] = useState('active');
  const [alertTypeFilter, setAlertTypeFilter] = useState('all');

  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const backendCode = selectedCountry === 'all' ? null : toBackendCode(selectedCountry);

  const fetchAlertes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await paysApi.alertes(backendCode);
      setAlertes(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [backendCode]);

  useEffect(() => {
    fetchAlertes();
    const interval = setInterval(fetchAlertes, 30000);
    return () => clearInterval(interval);
  }, [fetchAlertes]);

  const allActive = alertes.filter((a) => a.statut === 'ACTIVE');
  const allAcquitted = alertes.filter((a) => a.statut === 'ACQUITTEE');
  const allResolved = alertes.filter((a) => a.statut === 'RESOLUE');

  const filteredActive = useMemo(() => {
    return allActive.filter((a) => {
      if (alertTypeFilter === 'conditions') return a.type === 'CONDITIONS';
      if (alertTypeFilter === 'expiration') return a.type === 'PEREMPTION';
      return true;
    });
  }, [allActive, alertTypeFilter]);

  const handleAcquitter = async (alert) => {
    const code = alert.pays || backendCode || 'BRESIL';
    setActionLoading(alert.id);
    try {
      await paysApi.acquitterAlerte(code, alert.id);
      await fetchAlertes();
    } catch (e) {
      alert(`Erreur : ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResoudre = async (alert) => {
    const code = alert.pays || backendCode || 'BRESIL';
    setActionLoading(alert.id);
    try {
      await paysApi.resoudreAlerte(code, alert.id);
      await fetchAlertes();
    } catch (e) {
      alert(`Erreur : ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <DashboardLayout
      title="Vue consolidée"
      topTabs={COUNTRY_TABS}
      activeTab={selectedCountry}
      onTabChange={setSelectedCountry}
    >
      <div className="mb-8">
        <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-slate-900">
          {selectedTab === 'resolved' ? 'Historique des alertes' : 'Alertes'}
        </h1>
        <p className="text-sm sm:text-base text-slate-500">
          {selectedTab === 'resolved'
            ? 'Incidents clôturés, avec durée et mode de résolution.'
            : "Incidents en cours sur l'ensemble du réseau."}
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-6 border-b border-slate-200">
        <TabButton active={selectedTab === 'active'} onClick={() => setSelectedTab('active')}>
          Actives ({allActive.length})
        </TabButton>
        <TabButton active={selectedTab === 'acknowledged'} onClick={() => setSelectedTab('acknowledged')}>
          Acquittées ({allAcquitted.length})
        </TabButton>
        <TabButton active={selectedTab === 'resolved'} onClick={() => setSelectedTab('resolved')}>
          Résolues ({allResolved.length})
        </TabButton>
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        {selectedTab !== 'resolved' && (
          <div className="flex flex-wrap gap-3">
            <FilterChip active={alertTypeFilter === 'all'} onClick={() => setAlertTypeFilter('all')}>
              Tous types
            </FilterChip>
            <FilterChip active={alertTypeFilter === 'conditions'} onClick={() => setAlertTypeFilter('conditions')}>
              Conditions
            </FilterChip>
            <FilterChip active={alertTypeFilter === 'expiration'} onClick={() => setAlertTypeFilter('expiration')}>
              Péremption
            </FilterChip>
          </div>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-rose-700">
          Erreur de chargement : {error}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {selectedTab === 'active' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Entrepôt</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Déclenchée</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Notifs</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredActive.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <Badge tone={alert.type === 'PEREMPTION' ? 'danger' : 'warn'}>
                          {alert.type === 'PEREMPTION' ? 'Péremption' : 'Conditions'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-800">
                        {alert.message || alert.lotReference || `Entrepôt ${alert.entrepotId}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {alert.entrepotNom || `#${alert.entrepotId}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDate(alert.declencheeAt)}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-700">
                        {alert.nbNotifications}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            disabled={actionLoading === alert.id}
                            onClick={() => handleAcquitter(alert)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Acquitter
                          </button>
                          <button
                            disabled={actionLoading === alert.id}
                            onClick={() => handleResoudre(alert)}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                          >
                            Résoudre
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredActive.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                        Aucune alerte active pour ce filtre.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {selectedTab === 'acknowledged' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Entrepôt</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Déclenchée</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Acquittée</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {allAcquitted.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <Badge tone={alert.type === 'PEREMPTION' ? 'danger' : 'warn'}>
                          {alert.type === 'PEREMPTION' ? 'Péremption' : 'Conditions'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-800">
                        {alert.message || alert.lotReference || `Entrepôt ${alert.entrepotId}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {alert.entrepotNom || `#${alert.entrepotId}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDate(alert.declencheeAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDate(alert.acquitteeAt)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          disabled={actionLoading === alert.id}
                          onClick={() => handleResoudre(alert)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          Résoudre
                        </button>
                      </td>
                    </tr>
                  ))}
                  {allAcquitted.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                        Aucune alerte acquittée pour ce filtre.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {selectedTab === 'resolved' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Entrepôt</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Déclenchée</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Résolue</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {allResolved.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <Badge>{alert.type === 'PEREMPTION' ? 'Péremption' : 'Conditions'}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-800">
                        {alert.message || alert.lotReference || `Entrepôt ${alert.entrepotId}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {alert.entrepotNom || `#${alert.entrepotId}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDate(alert.declencheeAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDate(alert.resolueAt)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge tone={alert.modeResolution === 'AUTO' ? 'ok' : 'info'}>
                          {alert.modeResolution || 'Manuel'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {allResolved.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                        Aucune alerte résolue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
