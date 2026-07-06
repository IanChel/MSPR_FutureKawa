import React, { useMemo, useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import AlertsToProcess from '../components/AlertsToProcess';
import { superAdminNav } from '../config/navigation';
import CountrySummaryTable from '../components/CountrySummaryTable';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { paysApi, toBackendCode, formatDate } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const COUNTRIES = [
  { id: 'all', label: 'Tous' },
  { id: 'brazil', label: 'Brésil' },
  { id: 'ecuador', label: 'Équateur' },
  { id: 'colombia', label: 'Colombie' },
];

const PAYS_LABEL = { BRESIL: 'Brésil', EQUATEUR: 'Équateur', COLOMBIE: 'Colombie' };

function KpiCard({ item }) {
  const leftBorder =
    item.tone === 'danger'
      ? 'border-rose-500'
      : item.tone === 'success'
      ? 'border-emerald-500'
      : 'border-slate-200';

  const subColor =
    item.tone === 'danger'
      ? 'text-rose-600'
      : item.tone === 'success'
      ? 'text-emerald-600'
      : 'text-slate-500';

  return (
    <div className={`bg-white border-l-4 ${leftBorder} border-t border-r border-b border-slate-200 rounded-2xl p-5 shadow-sm`}>
      <p className="text-sm font-medium uppercase tracking-wider text-slate-500 mb-3">
        {item.label}
      </p>
      <div className="flex items-end gap-1">
        <span className="text-4xl font-bold text-slate-900">{item.value}</span>
        {item.suffix && (
          <span className="text-xl font-semibold text-slate-500 mb-1">{item.suffix}</span>
        )}
      </div>
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
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${styles}`}>
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

export default function Dashboard() {
  const [selectedCountry, setSelectedCountry] = useState('all');

  const [paysList, setPaysList] = useState([]);
  const [lots, setLots] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [mesures, setMesures] = useState([]);
  const [entrepots, setEntrepots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const backendCode = selectedCountry === 'all' ? null : toBackendCode(selectedCountry);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchBase = async () => {
      const [pays, lotsData, alertesData] = await Promise.all([
        paysApi.liste(),
        paysApi.lots(backendCode),
        paysApi.alertes(backendCode),
      ]);
      if (cancelled) return;
      setPaysList(pays || []);
      setLots(lotsData || []);
      setAlertes(alertesData || []);

      const code = backendCode || 'BRESIL';
      try {
        const exps = await paysApi.exploitations(code);
        if (cancelled || !exps?.length) return;
        const allEntrepots = [];
        await Promise.all(
          exps.map(async (exp) => {
            const ents = await paysApi.entrepots(code, exp.id);
            if (!cancelled) allEntrepots.push(...(ents || []));
          })
        );
        if (cancelled) return;
        setEntrepots(allEntrepots);
        if (allEntrepots.length > 0) {
          const mesData = await paysApi.mesuresEntrepot(code, allEntrepots[0].id);
          if (!cancelled) setMesures(mesData || []);
        }
      } catch {
        // mesures/entrepots sont optionnels
      }
    };

    fetchBase()
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [selectedCountry]);

  const activeAlerts = alertes.filter((a) => a.statut === 'ACTIVE');
  const acquittedAlerts = alertes.filter((a) => a.statut === 'ACQUITTEE');
  const resolvedAlerts = alertes.filter((a) => a.statut === 'RESOLUE');

  const paysConnected = paysList.filter((p) => p.disponible).length;
  const totalPays = paysList.length || 3;

  const perimsAlerts = activeAlerts.filter((a) => a.type === 'PEREMPTION').length;
  const condAlerts = activeAlerts.filter((a) => a.type === 'CONDITIONS').length;

  const kpis = useMemo(() => [
    {
      label: selectedCountry === 'all' ? 'Pays connectés' : 'Site connecté',
      value: selectedCountry === 'all' ? String(paysConnected) : (paysList.find(p => p.code === backendCode)?.disponible ? '1' : '0'),
      suffix: selectedCountry === 'all' ? `/${totalPays}` : '/1',
      sub: paysConnected === totalPays ? 'Tous les sites répondent' : `${totalPays - paysConnected} hors ligne`,
      tone: paysConnected === totalPays ? 'success' : 'danger',
    },
    {
      label: 'Lots en stock',
      value: String(lots.length),
      sub: perimsAlerts > 0 ? `dont ${perimsAlerts} proche${perimsAlerts > 1 ? 's' : ''} de péremption` : 'Aucune péremption proche',
      tone: 'default',
    },
    {
      label: 'Alertes actives',
      value: String(activeAlerts.length),
      sub: activeAlerts.length > 0 ? `${condAlerts} conditions · ${perimsAlerts} péremptions` : 'Aucune anomalie',
      tone: activeAlerts.length > 0 ? 'danger' : 'success',
    },
    {
      label: 'Entrepôts',
      value: String(entrepots.length),
      sub: entrepots.length > 0 ? `${entrepots.length} entrepôt${entrepots.length > 1 ? 's' : ''} suivi${entrepots.length > 1 ? 's' : ''}` : 'Données en cours de chargement',
      tone: 'default',
    },
  ], [selectedCountry, paysConnected, totalPays, lots, activeAlerts, condAlerts, perimsAlerts, entrepots, paysList, backendCode]);

  const mesuresRecentesTemp = useMemo(() => {
    const sorted = [...mesures].sort((a, b) => new Date(a.mesureAt) - new Date(b.mesureAt));
    return sorted.slice(-8);
  }, [mesures]);

  const lineLabels = mesuresRecentesTemp.map((m) => {
    const d = new Date(m.mesureAt);
    return d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  });

  const lineData = mesuresRecentesTemp.map((m) => m.temperature);
  const lastMesure = mesuresRecentesTemp[mesuresRecentesTemp.length - 1];

  const firstEntrepotNom = entrepots[0]?.nom || '—';
  const chartTitle = `Évolution des conditions — ${firstEntrepotNom}`;
  const chartCode = backendCode || 'BRESIL';
  const chartPays = PAYS_LABEL[chartCode] || chartCode;

  const lineChartData = useMemo(() => ({
    labels: lineLabels.length > 0 ? lineLabels : ['—'],
    datasets: [
      {
        label: 'Température',
        data: lineData.length > 0 ? lineData : [0],
        borderColor: '#0f766e',
        backgroundColor: 'rgba(16, 185, 129, 0.10)',
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#0f766e',
        pointBorderColor: '#0f766e',
      },
    ],
  }), [lineLabels, lineData]);

  const lineChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 12 }, maxRotation: 0, minRotation: 0 },
        border: { display: false },
      },
      y: {
        ticks: { display: false },
        grid: { color: 'rgba(148, 163, 184, 0.18)', borderDash: [5, 5], drawTicks: false },
        border: { display: false },
      },
    },
  }), []);

  const doughnutData = {
    labels: ['Péremption', 'Conditions', 'Résolues (7 j)'],
    datasets: [
      {
        data: [perimsAlerts, condAlerts, resolvedAlerts.length],
        backgroundColor: ['#e11d48', '#f59e0b', '#10b981'],
        borderWidth: 0,
        cutout: '62%',
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  const alertesForWidget = useMemo(() =>
    activeAlerts.slice(0, 5).map((a) => ({
      id: a.id,
      type: a.type === 'PEREMPTION' ? 'danger' : 'warning',
      title: a.message || `Alerte ${a.type}`,
      meta: formatDate(a.declencheeAt),
    })), [activeAlerts]);

  const warehouseRows = useMemo(() => {
    if (selectedCountry === 'all') {
      return paysList.map((p) => {
        const code = p.code;
        const paysLots = lots.filter((l) => l.pays === code);
        const paysAlerts = activeAlerts.filter((a) => a.pays === code);
        return {
          name: PAYS_LABEL[code] || code,
          stock: paysLots.length || '—',
          status: paysAlerts.length > 0 ? `${paysAlerts.length} alerte${paysAlerts.length > 1 ? 's' : ''}` : 'Conforme',
        };
      });
    }
    return entrepots.map((e) => {
      const eLots = lots.filter((l) => l.entrepotId === e.id);
      const eAlerts = activeAlerts.filter((a) => a.entrepotId === e.id);
      return {
        name: e.nom,
        stock: eLots.length,
        status: eAlerts.length > 0 ? `${eAlerts.length} alerte${eAlerts.length > 1 ? 's' : ''}` : 'Conforme',
      };
    });
  }, [selectedCountry, paysList, lots, activeAlerts, entrepots]);

  return (
    <DashboardLayout
      title="Vue consolidée"
      navItems={superAdminNav}
      topTabs={COUNTRIES}
      activeTab={selectedCountry}
      onTabChange={setSelectedCountry}
    >
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-rose-700">
          Erreur de chargement : {error}
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
              {selectedCountry === 'all' ? 'Vue consolidée — tous les pays' : `Vue consolidée — ${PAYS_LABEL[backendCode] || ''}`}
            </h1>
            <p className="text-slate-500 text-base sm:text-lg">
              État des stocks et des conditions de stockage en temps réel.
            </p>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {kpis.map((item) => <KpiCard key={item.label} item={item} />)}
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-6 mb-8">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{chartTitle}</h2>
                <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
                  {chartPays}
                </span>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-6 mb-8">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Température</p>
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-bold text-slate-900">
                        {lastMesure?.temperature?.toFixed(1) ?? '—'}
                      </span>
                      <span className="text-lg text-slate-500 mb-1">°C</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Humidité</p>
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-bold text-slate-900">
                        {lastMesure?.humidite?.toFixed(1) ?? '—'}
                      </span>
                      <span className="text-lg text-slate-500 mb-1">%HR</span>
                    </div>
                  </div>
                  {mesures.length === 0 && (
                    <StatusBadge type="ok">En attente de mesures</StatusBadge>
                  )}
                </div>
                <div className="h-[320px]">
                  {mesures.length > 0 ? (
                    <Line data={lineChartData} options={lineChartOptions} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                      Aucune mesure disponible
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Répartition des alertes</h2>
              </div>
              <div className="p-6 flex flex-col lg:flex-row items-center justify-center gap-8 min-h-[380px]">
                <div className="w-[220px] h-[220px]">
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                </div>
                <div className="space-y-4 w-full max-w-[260px]">
                  <div className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded bg-rose-500" />
                      <span className="text-slate-700">Péremption</span>
                    </div>
                    <span className="font-bold text-slate-900">{perimsAlerts}</span>
                  </div>
                  <div className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded bg-amber-500" />
                      <span className="text-slate-700">Conditions</span>
                    </div>
                    <span className="font-bold text-slate-900">{condAlerts}</span>
                  </div>
                  <div className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded bg-emerald-500" />
                      <span className="text-slate-700">Résolues</span>
                    </div>
                    <span className="font-bold text-slate-900">{resolvedAlerts.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-slate-200">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Répartition des stocks</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wider">
                      {selectedCountry === 'all' ? 'Pays' : 'Entrepôt'}
                    </th>
                    <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wider">Lots en stock</th>
                    <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {warehouseRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-400 text-sm">
                        Aucune donnée disponible
                      </td>
                    </tr>
                  ) : (
                    warehouseRows.map((row) => {
                      const badgeType = row.status.toLowerCase().includes('alerte') ? 'warn' : 'ok';
                      return (
                        <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-800">{row.name}</td>
                          <td className="px-6 py-4 text-slate-700">{row.stock}</td>
                          <td className="px-6 py-4">
                            <StatusBadge type={badgeType}>{row.status}</StatusBadge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="space-y-8">
            <AlertsToProcess alerts={alertesForWidget} />
            {selectedCountry === 'all' && <CountrySummaryTable />}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
