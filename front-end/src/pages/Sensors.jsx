import React, { useMemo, useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { paysApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const FILTERS = ['Tous', 'Actifs', 'Silencieux'];

const SILENCE_THRESHOLD_MS = 10 * 60 * 1000;

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

function timeSince(isoDate) {
  if (!isoDate) return '—';
  const diff = Date.now() - new Date(isoDate).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `il y a ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  return `il y a ${h} h`;
}

const PAYS_LABEL = { BRESIL: 'Brésil', EQUATEUR: 'Équateur', COLOMBIE: 'Colombie' };

export default function Sensors() {
  const { user } = useAuth();
  const userPaysCode = user?.pays || 'BRESIL';

  const [sensors, setSensors] = useState([]);
  const [entrepotMap, setEntrepotMap] = useState({});
  const [mesuresMap, setMesuresMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('Tous');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      const exps = await paysApi.exploitations(userPaysCode);
      if (cancelled) return;

      const allEnts = [];
      await Promise.all(
        (exps || []).map(async (exp) => {
          const ents = await paysApi.entrepots(userPaysCode, exp.id);
          (ents || []).forEach((e) => allEnts.push(e));
        })
      );
      if (cancelled) return;

      const eMap = {};
      allEnts.forEach((e) => { eMap[e.id] = e.nom; });
      setEntrepotMap(eMap);

      const allSensors = [];
      const mMap = {};
      await Promise.all(
        allEnts.map(async (ent) => {
          try {
            const caps = await paysApi.capteurs(userPaysCode, ent.id);
            (caps || []).forEach((c) => allSensors.push({ ...c, entrepotId: ent.id, entrepotNom: ent.nom }));
            const mes = await paysApi.mesuresEntrepot(userPaysCode, ent.id);
            if (mes?.length > 0) {
              const sorted = [...mes].sort((a, b) => new Date(b.mesureAt) - new Date(a.mesureAt));
              mMap[ent.id] = sorted[0];
            }
          } catch {}
        })
      );
      if (cancelled) return;
      setSensors(allSensors);
      setMesuresMap(mMap);
    };

    load()
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [userPaysCode]);

  const enrichedSensors = useMemo(() => {
    return sensors.map((s) => {
      const derniereMesure = mesuresMap[s.entrepotId];
      const mesureAt = derniereMesure?.mesureAt;
      const isSilent = !mesureAt || (Date.now() - new Date(mesureAt).getTime()) > SILENCE_THRESHOLD_MS;
      return {
        ...s,
        derniereMesure,
        isSilent,
        status: isSilent ? 'Silencieux' : 'Actif',
      };
    });
  }, [sensors, mesuresMap]);

  const displayedSensors = useMemo(() => {
    if (activeFilter === 'Actifs') return enrichedSensors.filter((s) => s.status === 'Actif');
    if (activeFilter === 'Silencieux') return enrichedSensors.filter((s) => s.status === 'Silencieux');
    return enrichedSensors;
  }, [enrichedSensors, activeFilter]);

  return (
    <DashboardLayout title="Périmètre" menuVariant="admin-country">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Capteurs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Un capteur est « actif » s'il a transmis une mesure dans les 10 dernières minutes — {PAYS_LABEL[userPaysCode]}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeFilter === filter
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filter}
            </button>
          ))}
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
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Capteur</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Entrepôt</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Dernière mesure</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Valeurs</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {displayedSensors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">
                        Aucun capteur trouvé.
                      </td>
                    </tr>
                  ) : (
                    displayedSensors.map((sensor) => (
                      <tr key={sensor.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-sm text-slate-800">
                          {sensor.identifiantMqtt}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{sensor.entrepotNom}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {timeSince(sensor.derniereMesure?.mesureAt)}
                        </td>
                        <td className="px-6 py-4">
                          {sensor.isSilent ? (
                            <span className="text-sm text-slate-400">—</span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <Readout value={sensor.derniereMesure?.temperature?.toFixed(1)} unit="°C" />
                              <span className="text-slate-300">·</span>
                              <Readout value={sensor.derniereMesure?.humidite?.toFixed(1)} unit="%" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge tone={sensor.isSilent ? 'danger' : 'ok'}>
                            {sensor.status}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))
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
