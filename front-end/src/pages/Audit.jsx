import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { auditApi, formatDate } from '../services/api';

const ACTION_TONES = {
  USER_DELETE: 'danger',
  USER_DESACTIVER: 'warn',
  USER_CHANGER_ROLE: 'info',
  USER_CREATE: 'ok',
};

function Badge({ children, tone = 'info' }) {
  const styles =
    tone === 'warn'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : tone === 'danger'
      ? 'bg-rose-50 text-rose-700 border border-rose-200'
      : tone === 'ok'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-slate-100 text-slate-600 border border-slate-200';

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles}`}>
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-emerald-600 animate-spin" />
    </div>
  );
}

const PAYS_LABEL = { BRESIL: 'Brésil', EQUATEUR: 'Équateur', COLOMBIE: 'Colombie' };

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    auditApi.consulter()
      .then(setLogs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const uniqueActions = useMemo(() => {
    const actions = [...new Set(logs.map((l) => l.action))];
    return actions;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchAction = actionFilter === 'all' || log.action === actionFilter;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        log.action?.toLowerCase().includes(q) ||
        log.ressource?.toLowerCase().includes(q) ||
        log.paysCible?.toLowerCase().includes(q) ||
        String(log.auteurId)?.includes(q);
      return matchAction && matchSearch;
    });
  }, [logs, actionFilter, search]);

  return (
    <DashboardLayout title="Audit">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Audit & traçabilité
        </h1>
        <p className="text-slate-500 text-sm sm:text-base">
          Journal des actions sensibles : qui a fait quoi, quand et où.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 w-full md:w-[320px]">
          <span>🔍</span>
          <input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full outline-none text-sm"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
        >
          <option value="all">Toutes les actions</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-rose-700">
          Erreur : {error}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left p-4">Horodatage</th>
                <th className="text-left p-4">Auteur (ID)</th>
                <th className="text-left p-4">Action</th>
                <th className="text-left p-4">Ressource</th>
                <th className="text-left p-4">Pays</th>
                <th className="text-left p-4">Résultat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Aucune entrée d'audit trouvée.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 text-xs text-slate-600 font-mono">
                      {formatDate(log.horodatage)}
                    </td>
                    <td className="p-4 text-slate-700">#{log.auteurId}</td>
                    <td className="p-4">
                      <Badge tone={ACTION_TONES[log.action] || 'info'}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-4 text-slate-700">{log.ressource || '—'}</td>
                    <td className="p-4">{PAYS_LABEL[log.paysCible] || log.paysCible || '—'}</td>
                    <td className="p-4">
                      <Badge tone={log.resultat === 'OK' ? 'ok' : 'danger'}>
                        {log.resultat}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
