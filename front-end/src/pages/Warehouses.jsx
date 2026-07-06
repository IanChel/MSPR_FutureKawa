import React, { useMemo, useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { paysApi, toBackendCode } from '../services/api';
import { useAuth } from '../context/AuthContext';

function StatusBadge({ children, tone = 'ok' }) {
  const styles =
    tone === 'danger'
      ? 'bg-rose-50 text-rose-700 border border-rose-200'
      : tone === 'warn'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : 'bg-emerald-50 text-emerald-700 border border-emerald-200';

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {children}
    </span>
  );
}

function Readout({ value, unit, out = false }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 ${out ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-700'}`}>
      <span className="text-sm font-bold">{value != null ? value : '—'}</span>
      <span className="text-xs">{unit}</span>
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

export default function Warehouses() {
  const { user } = useAuth();

  const userPaysCode = user?.pays || 'BRESIL';
  const paysLabel = PAYS_LABEL[userPaysCode] || userPaysCode;

  const [exploitations, setExploitations] = useState([]);
  const [entrepots, setEntrepots] = useState([]);
  const [mesuresMap, setMesuresMap] = useState({});
  const [lotsMap, setLotsMap] = useState({});
  const [alertesMap, setAlertesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedExp, setSelectedExp] = useState('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      const exps = await paysApi.exploitations(userPaysCode);
      if (cancelled) return;
      setExploitations(exps || []);

      const allEnts = [];
      await Promise.all(
        (exps || []).map(async (exp) => {
          const ents = await paysApi.entrepots(userPaysCode, exp.id);
          (ents || []).forEach((e) => allEnts.push({ ...e, exploitationNom: exp.nom }));
        })
      );
      if (cancelled) return;
      setEntrepots(allEnts);

      const mMap = {};
      const lMap = {};
      await Promise.all(
        allEnts.map(async (ent) => {
          try {
            const mes = await paysApi.mesuresEntrepot(userPaysCode, ent.id);
            if (mes?.length > 0) {
              const sorted = [...mes].sort((a, b) => new Date(b.mesureAt) - new Date(a.mesureAt));
              mMap[ent.id] = sorted[0];
            }
          } catch {}
        })
      );
      if (cancelled) return;
      setMesuresMap(mMap);

      const lots = await paysApi.lots(userPaysCode);
      const lotsGroupe = {};
      (lots || []).forEach((l) => {
        if (!lotsGroupe[l.entrepotId]) lotsGroupe[l.entrepotId] = 0;
        lotsGroupe[l.entrepotId]++;
      });
      if (!cancelled) setLotsMap(lotsGroupe);

      const alertes = await paysApi.alertes(userPaysCode);
      const alertesGroupe = {};
      (alertes || []).filter((a) => a.statut === 'ACTIVE').forEach((a) => {
        if (!alertesGroupe[a.entrepotId]) alertesGroupe[a.entrepotId] = 0;
        alertesGroupe[a.entrepotId]++;
      });
      if (!cancelled) setAlertesMap(alertesGroupe);
    };

    load()
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [userPaysCode]);

  const filteredEntrepots = useMemo(() => {
    if (selectedExp === 'all') return entrepots;
    return entrepots.filter((e) => String(e.exploitationId) === selectedExp);
  }, [entrepots, selectedExp]);

  return (
    <DashboardLayout
      title="Périmètre"
      menuVariant="admin-country"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Entrepôts</h1>
          <p className="mt-1 text-sm text-slate-500">
            Conditions actuelles par lieu de stockage — {paysLabel}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedExp}
            onChange={(e) => setSelectedExp(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:border-emerald-500"
          >
            <option value="all">Toutes les exploitations</option>
            {exploitations.map((exp) => (
              <option key={exp.id} value={String(exp.id)}>{exp.nom}</option>
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
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Entrepôt</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Exploitation</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Lots</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Température</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Humidité</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredEntrepots.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">
                        Aucun entrepôt disponible.
                      </td>
                    </tr>
                  ) : (
                    filteredEntrepots.map((ent) => {
                      const mes = mesuresMap[ent.id];
                      const nbAlertes = alertesMap[ent.id] || 0;
                      const nbLots = lotsMap[ent.id] || 0;
                      const isOut = nbAlertes > 0;

                      return (
                        <tr key={ent.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900">{ent.nom}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{ent.exploitationNom || '—'}</td>
                          <td className="px-6 py-4 text-sm font-mono text-slate-700">{nbLots}</td>
                          <td className="px-6 py-4">
                            <Readout value={mes?.temperature?.toFixed(1)} unit="°C" out={isOut} />
                          </td>
                          <td className="px-6 py-4">
                            <Readout value={mes?.humidite?.toFixed(1)} unit="%" out={isOut} />
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge tone={isOut ? 'danger' : 'ok'}>
                              {isOut ? `${nbAlertes} alerte${nbAlertes > 1 ? 's' : ''}` : 'Conforme'}
                            </StatusBadge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
