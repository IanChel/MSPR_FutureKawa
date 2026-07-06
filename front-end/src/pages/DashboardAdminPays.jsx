import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { adminPaysNav } from '../config/navigation';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { paysApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);

const PAYS_LABEL = { BRESIL: 'Brésil', EQUATEUR: 'Équateur', COLOMBIE: 'Colombie' };

function KpiCard({ item }) {
  const toneStyles =
    item.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50/60'
      : item.tone === 'danger'
      ? 'border-rose-200 bg-rose-50/60'
      : 'border-slate-200 bg-white';

  const subColor =
    item.tone === 'success'
      ? 'text-emerald-700'
      : item.tone === 'danger'
      ? 'text-rose-700'
      : 'text-slate-500';

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneStyles}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
      <div className="mt-3 text-3xl font-bold text-slate-900">{item.value}</div>
      <p className={`mt-2 text-sm ${subColor}`}>{item.sub}</p>
    </div>
  );
}

function StatusBadge({ children, type = 'ok' }) {
  const styles =
    type === 'warn'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : type === 'danger'
      ? 'bg-rose-50 text-rose-700 border border-rose-200'
      : 'bg-emerald-50 text-emerald-700 border border-emerald-200';

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
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

export default function DashboardAdminPays() {
  const { user } = useAuth();
  const paysCode = user?.pays || 'BRESIL';
  const paysLabel = PAYS_LABEL[paysCode] || paysCode;

  const [lots, setLots] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [entrepots, setEntrepots] = useState([]);
  const [mesures, setMesures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      const [lotsData, alertesData, exps] = await Promise.all([
        paysApi.lots(paysCode),
        paysApi.alertes(paysCode),
        paysApi.exploitations(paysCode),
      ]);
      if (cancelled) return;
      setLots(lotsData || []);
      setAlertes(alertesData || []);

      const allEnts = [];
      await Promise.all(
        (exps || []).map(async (exp) => {
          const ents = await paysApi.entrepots(paysCode, exp.id);
          (ents || []).forEach((e) => allEnts.push({ ...e, exploitationNom: exp.nom }));
        })
      );
      if (cancelled) return;
      setEntrepots(allEnts);

      if (allEnts.length > 0) {
        try {
          const mes = await paysApi.mesuresEntrepot(paysCode, allEnts[0].id);
          if (!cancelled) setMesures(mes || []);
        } catch {}
      }
    };

    load()
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [paysCode]);

  const activeAlerts = alertes.filter((a) => a.statut === 'ACTIVE');

  const kpis = useMemo(() => [
    {
      label: 'Lots en stock',
      value: String(lots.length),
      sub: `${entrepots.length} entrepôt${entrepots.length > 1 ? 's' : ''} actif${entrepots.length > 1 ? 's' : ''}`,
      tone: 'default',
    },
    {
      label: 'Alertes actives',
      value: String(activeAlerts.length),
      sub: activeAlerts.length === 0 ? 'Aucune anomalie' : `${activeAlerts.length} alerte${activeAlerts.length > 1 ? 's' : ''}`,
      tone: activeAlerts.length > 0 ? 'danger' : 'success',
    },
    {
      label: 'Entrepôts',
      value: String(entrepots.length),
      sub: entrepots.length > 0 ? 'En surveillance' : 'Chargement…',
      tone: 'success',
    },
    {
      label: 'Dernière mesure',
      value: (() => {
        const lastMes = [...mesures].sort((a, b) => new Date(b.mesureAt) - new Date(a.mesureAt))[0];
        return lastMes ? `${lastMes.temperature?.toFixed(1)}°C` : '—';
      })(),
      sub: entrepots[0]?.nom ? `${entrepots[0].nom}` : 'Aucune mesure',
      tone: 'default',
    },
  ], [lots, activeAlerts, entrepots, mesures]);

  const recentMesures = useMemo(() => {
    return [...mesures]
      .sort((a, b) => new Date(a.mesureAt) - new Date(b.mesureAt))
      .slice(-8);
  }, [mesures]);

  const chartData = {
    labels: recentMesures.map((m) =>
      new Date(m.mesureAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    ),
    datasets: [
      {
        label: 'Température',
        data: recentMesures.map((m) => m.temperature),
        borderColor: '#0f766e',
        backgroundColor: 'rgba(15,118,110,0.10)',
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 2,
        pointHoverRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#0f172a', titleColor: '#fff', bodyColor: '#fff' },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 0 },
      },
      y: {
        grid: { color: 'rgba(148,163,184,0.18)', drawTicks: false },
        border: { display: false },
        ticks: { display: false },
      },
    },
  };

  const warehouseRows = useMemo(() => {
    return entrepots.map((ent) => {
      const nbLots = lots.filter((l) => l.entrepotId === ent.id).length;
      const nbAlertes = activeAlerts.filter((a) => a.entrepotId === ent.id).length;
      return {
        name: ent.nom,
        stock: nbLots,
        status: nbAlertes > 0 ? `${nbAlertes} alerte${nbAlertes > 1 ? 's' : ''}` : 'Conforme',
        isAlert: nbAlertes > 0,
      };
    });
  }, [entrepots, lots, activeAlerts]);

  const lastMes = [...mesures].sort((a, b) => new Date(b.mesureAt) - new Date(a.mesureAt))[0];

  return (
    <DashboardLayout
      title="Périmètre"
      navItems={adminPaysNav}
      topRightContent={
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          🟢 {paysLabel}
        </span>
      }
    >
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-rose-700">
          Erreur : {error}
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{paysLabel} — supervision</h1>
            <p className="mt-2 text-sm text-slate-500">
              Vos exploitations, entrepôts et conditions de stockage en temps réel.
            </p>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {kpis.map((item) => <KpiCard key={item.label} item={item} />)}
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Conditions — {entrepots[0]?.nom || 'Premier entrepôt'}
                </h2>
                <StatusBadge type={activeAlerts.length > 0 ? 'warn' : 'ok'}>
                  {activeAlerts.length > 0 ? 'Alerte active' : 'Conforme'}
                </StatusBadge>
              </div>
              <div className="p-5">
                <div className="mb-5 flex items-center gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Température</p>
                    <div className="mt-1 flex items-end gap-1">
                      <span className="text-3xl font-bold text-slate-900">
                        {lastMes?.temperature?.toFixed(1) ?? '—'}
                      </span>
                      <span className="text-sm text-slate-500">°C</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Humidité</p>
                    <div className="mt-1 flex items-end gap-1">
                      <span className="text-3xl font-bold text-slate-900">
                        {lastMes?.humidite?.toFixed(1) ?? '—'}
                      </span>
                      <span className="text-sm text-slate-500">%HR</span>
                    </div>
                  </div>
                </div>
                <div className="h-[250px]">
                  {recentMesures.length > 0 ? (
                    <Line data={chartData} options={chartOptions} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                      Aucune mesure disponible
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">Stock par entrepôt</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-slate-200">
                    {warehouseRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-slate-400 text-sm">
                          Aucun entrepôt disponible.
                        </td>
                      </tr>
                    ) : (
                      warehouseRows.map((row) => (
                        <tr key={row.name}>
                          <td className="px-5 py-4 text-sm font-medium text-slate-800">{row.name}</td>
                          <td className="px-5 py-4 text-sm text-slate-700">{row.stock} lots</td>
                          <td className="px-5 py-4">
                            <StatusBadge type={row.isAlert ? 'warn' : 'ok'}>{row.status}</StatusBadge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {activeAlerts.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">Alertes actives</h2>
              </div>
              <div className="p-4 space-y-3">
                {activeAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-4 rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                      alert.type === 'PEREMPTION' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {alert.type === 'PEREMPTION' ? '▲' : '∿'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {alert.message || alert.lotReference || `Entrepôt #${alert.entrepotId}`}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(alert.declencheeAt).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
