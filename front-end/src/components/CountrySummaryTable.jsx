import React from 'react';
import { Download } from 'lucide-react';

const COUNTRY_ROWS = [
  {
    country: 'Brésil',
    lots: 128,
    alerts: 2,
    sensors: '6/6',
    avgTemp: '29.4',
    status: 'Disponible',
    alertColor: 'rose',
  },
  {
    country: 'Équateur',
    lots: 94,
    alerts: 0,
    sensors: '6/6',
    avgTemp: '31.1',
    status: 'Disponible',
    alertColor: 'slate',
  },
  {
    country: 'Colombie',
    lots: 90,
    alerts: 2,
    sensors: '5/6',
    avgTemp: '26.3',
    status: 'Disponible',
    alertColor: 'amber',
  },
];

function alertBadgeClass(color) {
  switch (color) {
    case 'rose':
      return 'bg-rose-100 text-rose-700';
    case 'amber':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export default function CountrySummaryTable() {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Synthèse par pays</h2>

        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm font-semibold hover:bg-slate-50 transition-colors">
          <Download className="w-4 h-4" />
          Exporter
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead className="bg-white">
            <tr className="text-slate-500 uppercase tracking-wide text-sm border-b border-slate-200">
              <th className="px-6 py-5 font-semibold">Pays</th>
              <th className="px-6 py-5 font-semibold">Lots</th>
              <th className="px-6 py-5 font-semibold">Alertes actives</th>
              <th className="px-6 py-5 font-semibold">Capteurs</th>
              <th className="px-6 py-5 font-semibold">Température moy.</th>
              <th className="px-6 py-5 font-semibold">Statut</th>
            </tr>
          </thead>

          <tbody>
            {COUNTRY_ROWS.map((row) => (
              <tr key={row.country} className="border-b border-slate-200 last:border-b-0">
                <td className="px-6 py-6 text-2xl font-bold text-slate-900">
                  {row.country}
                </td>

                <td className="px-6 py-6 text-2xl text-slate-900">
                  {row.lots}
                </td>

                <td className="px-6 py-6">
                  <span
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-semibold ${alertBadgeClass(
                      row.alertColor
                    )}`}
                  >
                    <span className="w-3 h-3 rounded-full bg-current opacity-80"></span>
                    {row.alerts}
                  </span>
                </td>

                <td className="px-6 py-6 text-2xl text-slate-900">
                  {row.sensors}
                </td>

                <td className="px-6 py-6 text-2xl font-bold text-slate-900">
                  {row.avgTemp} <span className="text-lg font-medium text-slate-500">°C</span>
                </td>

                <td className="px-6 py-6">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-lg font-semibold">
                    <span className="w-3 h-3 rounded-full bg-emerald-700"></span>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}