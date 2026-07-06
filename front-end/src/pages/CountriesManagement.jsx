import React from 'react';
import DashboardLayout from '../layouts/DashboardLayout';

const countries = [
  {
    id: 'brazil',
    name: 'Brésil',
    status: 'Disponible',
    target: '29 °C · 55 %HR',
    tolerance: '± 3 °C · ± 2 %',
    lots: 128,
    sensors: '6/6 en ligne',
    alerts: '2 actives',
    alertTone: 'danger',
  },
  {
    id: 'ecuador',
    name: 'Équateur',
    status: 'Disponible',
    target: '31 °C · 60 %HR',
    tolerance: '± 3 °C · ± 2 %',
    lots: 94,
    sensors: '6/6 en ligne',
    alerts: '0',
    alertTone: 'neutral',
  },
  {
    id: 'colombia',
    name: 'Colombie',
    status: 'Disponible',
    target: '26 °C · 80 %HR',
    tolerance: '± 3 °C · ± 2 %',
    lots: 90,
    sensors: '5/6 en ligne',
    alerts: '2 actives',
    alertTone: 'warn',
  },
];

function StatusBadge({ children, tone = 'ok' }) {
  const styles =
    tone === 'danger'
      ? 'bg-rose-50 text-rose-700 border border-rose-200'
      : tone === 'warn'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : tone === 'neutral'
      ? 'bg-slate-100 text-slate-600 border border-slate-200'
      : 'bg-emerald-50 text-emerald-700 border border-emerald-200';

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles}`}
    >
      {children}
    </span>
  );
}

function CountryCard({ country }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">
            {country.name}
          </h3>
          <StatusBadge tone="ok">{country.status}</StatusBadge>
        </div>

        <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-slate-500">Cible</dt>
          <dd className="font-mono text-slate-800">{country.target}</dd>

          <dt className="text-slate-500">Tolérance</dt>
          <dd className="font-mono text-slate-800">{country.tolerance}</dd>

          <dt className="text-slate-500">Lots</dt>
          <dd className="font-mono text-slate-800">{country.lots}</dd>

          <dt className="text-slate-500">Capteurs</dt>
          <dd className="font-mono text-slate-800">{country.sensors}</dd>

          <dt className="text-slate-500">Alertes</dt>
          <dd>
            <StatusBadge tone={country.alertTone}>{country.alerts}</StatusBadge>
          </dd>
        </dl>
      </div>
    </div>
  );
}

export default function CountriesManagement() {
  return (
    <DashboardLayout
      title="Pays"
      user={{
        initials: 'SA',
        name: 'Super Admin',
        role: 'Siège · tous pays',
      }}
    >
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Pays du réseau
        </h1>
        <p className="text-sm sm:text-base text-slate-500">
          Chaque pays est un site déployé indépendamment. Les seuils sont propres
          à chaque terroir.
        </p>
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {countries.map((country) => (
          <CountryCard key={country.id} country={country} />
        ))}
      </section>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
        <span className="font-semibold">ℹ️ Information :</span>{' '}
        Les pays ne se créent pas depuis l’interface. Ajouter un pays revient à
        déployer une nouvelle instance du back-end dans l’architecture
        multi-instances.
      </div>
    </DashboardLayout>
  );
}