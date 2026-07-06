import React, { useMemo, useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { paysApi, toBackendCode } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

const COUNTRY_TABS = [
  { id: 'all', label: 'Tous' },
  { id: 'brazil', label: 'Brésil' },
  { id: 'ecuador', label: 'Équateur' },
  { id: 'colombia', label: 'Colombie' },
];

const PAYS_LABEL = { BRESIL: 'Brésil', EQUATEUR: 'Équateur', COLOMBIE: 'Colombie' };
const REFRESH_MS = 2000;

function StatusBadge({ children, tone = 'ok' }) {
  const styles =
    tone === 'warn'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : tone === 'danger'
      ? 'bg-rose-50 text-rose-700 border border-rose-200'
      : 'bg-emerald-50 text-emerald-700 border border-emerald-200';

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {children}
    </span>
  );
}

function buildLineOptions({ yMin, yMax }) {
  return {
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
        ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 0, minRotation: 0 },
        border: { display: false },
      },
      y: {
        min: yMin,
        max: yMax,
        ticks: { color: '#94a3b8', font: { size: 11 } },
        grid: { color: 'rgba(148, 163, 184, 0.18)', borderDash: [5, 5], drawTicks: false },
        border: { display: false },
      },
    },
  };
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-emerald-600 animate-spin" />
    </div>
  );
}

function MeasureCard({ title, badge, readout, readoutUnit, readoutTone = 'ok', chartData, chartOptions }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <div className="md:ml-auto flex flex-wrap items-center gap-3">
          <StatusBadge tone="ok">{badge}</StatusBadge>
          <div
            className={`inline-flex items-end gap-1 rounded-2xl px-3 py-2 ${
              readoutTone === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-800'
            }`}
          >
            <span className="text-2xl font-bold">{readout ?? '—'}</span>
            <span className="text-sm mb-0.5">{readoutUnit}</span>
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="h-[280px]">
          {chartData.datasets[0].data.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              Aucune mesure disponible pour cet entrepôt.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MeasuresPage() {
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('7 jours');

  const [entrepots, setEntrepots] = useState([]);
  const [selectedEntrepotId, setSelectedEntrepotId] = useState(null);
  const [mesures, setMesures] = useState([]);
  const [loadingEntrepots, setLoadingEntrepots] = useState(true);
  const [loadingMesures, setLoadingMesures] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const backendCode = selectedCountry === 'all' ? 'BRESIL' : toBackendCode(selectedCountry);

  useEffect(() => {
    let cancelled = false;
    setLoadingEntrepots(true);
    setEntrepots([]);
    setSelectedEntrepotId(null);
    setMesures([]);
    setLastUpdated(null);
    setError(null);

    const load = async () => {
      const exps = await paysApi.exploitations(backendCode);
      if (cancelled) return;
      const allEnts = [];
      await Promise.all(
        (exps || []).map(async (exp) => {
          const ents = await paysApi.entrepots(backendCode, exp.id);
          if (!cancelled) allEnts.push(...(ents || []));
        })
      );
      if (cancelled) return;
      setEntrepots(allEnts);
      if (allEnts.length > 0) setSelectedEntrepotId(allEnts[0].id);
    };

    load()
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoadingEntrepots(false); });

    return () => { cancelled = true; };
  }, [backendCode]);

  useEffect(() => {
    if (!selectedEntrepotId) {
      setMesures([]);
      setLastUpdated(null);
      setLoadingMesures(false);
      return;
    }

    let cancelled = false;
    let refreshTimeout = null;
    let isRequestRunning = false;

    const charger = async (initial) => {
      if (isRequestRunning) return;
      isRequestRunning = true;
      if (initial) setLoadingMesures(true);

      try {
        const data = await paysApi.mesuresEntrepot(backendCode, selectedEntrepotId);
        if (cancelled) return;
        setMesures(data || []);
        setLastUpdated(new Date());
        setError(null);
      } catch (e) {
        if (!cancelled && initial) {
          setMesures([]);
          setError(e.message);
        }
      } finally {
        isRequestRunning = false;
        if (!cancelled && initial) setLoadingMesures(false);
      }
    };

    charger(true);

    const scheduleRefresh = () => {
      refreshTimeout = setTimeout(async () => {
        await charger(false);
        if (!cancelled) scheduleRefresh();
      }, REFRESH_MS);
    };

    scheduleRefresh();

    return () => {
      cancelled = true;
      if (refreshTimeout) clearTimeout(refreshTimeout);
    };
  }, [backendCode, selectedEntrepotId]);

  const periodHours = selectedPeriod === '24 h' ? 24 : selectedPeriod === '30 jours' ? 720 : 168;

  const filteredMesures = useMemo(() => {
    const cutoff = new Date(Date.now() - periodHours * 3600 * 1000);
    return mesures
      .filter((m) => new Date(m.mesureAt) >= cutoff)
      .sort((a, b) => new Date(a.mesureAt) - new Date(b.mesureAt));
  }, [mesures, periodHours]);

  const labels = filteredMesures.map((m) =>
    new Date(m.mesureAt).toLocaleString('fr-FR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  );

  const tempValues = filteredMesures.map((m) => m.temperature);
  const humValues = filteredMesures.map((m) => m.humidite);

  const lastMesure = filteredMesures[filteredMesures.length - 1];
  const tempMin = tempValues.length ? Math.min(...tempValues) : 0;
  const tempMax = tempValues.length ? Math.max(...tempValues) : 40;
  const humMin = humValues.length ? Math.min(...humValues) : 0;
  const humMax = humValues.length ? Math.max(...humValues) : 100;

  const temperatureChartData = {
    labels,
    datasets: [
      {
        label: 'Température',
        data: tempValues,
        borderColor: '#0f766e',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        fill: false,
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#0f766e',
        pointBorderColor: '#0f766e',
      },
    ],
  };

  const humidityChartData = {
    labels,
    datasets: [
      {
        label: 'Humidité',
        data: humValues,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        fill: false,
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#2563eb',
        pointBorderColor: '#2563eb',
      },
    ],
  };

  const temperatureOptions = useMemo(
    () => buildLineOptions({ yMin: Math.max(0, tempMin - 5), yMax: tempMax + 5 }),
    [tempMin, tempMax]
  );

  const humidityOptions = useMemo(
    () => buildLineOptions({ yMin: Math.max(0, humMin - 5), yMax: Math.min(100, humMax + 5) }),
    [humMin, humMax]
  );

  const selectedEntrepotNom = entrepots.find((e) => e.id === selectedEntrepotId)?.nom || '—';

  return (
    <DashboardLayout
      title="Mesures"
      topTabs={COUNTRY_TABS}
      activeTab={selectedCountry}
      onTabChange={setSelectedCountry}
    >
      <div className="mb-8">
        <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-slate-900">
          Mesures — {selectedCountry === 'all' ? 'vue consolidée' : PAYS_LABEL[backendCode]}
        </h1>
        <p className="text-sm sm:text-base text-slate-500">
          Historique des conditions relevées par les capteurs.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        {loadingEntrepots ? (
          <div className="text-sm text-slate-400">Chargement des entrepôts…</div>
        ) : (
          <select
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500"
            value={selectedEntrepotId || ''}
            onChange={(e) => setSelectedEntrepotId(Number(e.target.value))}
          >
            {entrepots.map((e) => (
              <option key={e.id} value={e.id}>{e.nom}</option>
            ))}
            {entrepots.length === 0 && (
              <option value="">Aucun entrepôt disponible</option>
            )}
          </select>
        )}

        <div className="flex flex-wrap gap-2">
          {['24 h', '7 jours', '30 jours'].map((period) => {
            const active = selectedPeriod === period;
            return (
              <button
                key={period}
                type="button"
                onClick={() => setSelectedPeriod(period)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {period}
              </button>
            );
          })}
        </div>

        <div className="lg:ml-auto flex items-center gap-2 text-sm text-slate-500">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-medium text-emerald-700">En direct</span>
          {lastUpdated && (
            <span className="text-slate-400">
              · {lastUpdated.toLocaleTimeString('fr-FR')}
            </span>
          )}
        </div>
      </div>

      {loadingMesures ? (
        <Spinner />
      ) : error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-rose-700">
          Erreur : {error}
        </div>
      ) : (
        <div className="space-y-6">
          <MeasureCard
            title="Température"
            badge={`${selectedEntrepotNom}`}
            readout={lastMesure?.temperature?.toFixed(1) ?? null}
            readoutUnit="°C"
            readoutTone={lastMesure?.temperature > 35 ? 'warn' : 'ok'}
            chartData={temperatureChartData}
            chartOptions={temperatureOptions}
          />
          <MeasureCard
            title="Humidité"
            badge={`${selectedEntrepotNom}`}
            readout={lastMesure?.humidite?.toFixed(1) ?? null}
            readoutUnit="%HR"
            readoutTone="ok"
            chartData={humidityChartData}
            chartOptions={humidityOptions}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
