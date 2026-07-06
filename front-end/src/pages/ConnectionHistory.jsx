import React from 'react';
import DashboardLayout from '../layouts/DashboardLayout';

const logs = [
  {
    time: '22 juin · 11:48:23',
    user: 'simulateur@futurekawa.example',
    ip: '127.0.0.1',
    status: 'ok',
  },
  {
    time: '22 juin · 11:48:19',
    user: 'admin-equateur@futurekawa.example',
    ip: '192.168.1.24',
    status: 'ok',
  },
  {
    time: '22 juin · 11:32:02',
    user: 'admin-bresil@futurekawa.example',
    ip: '192.168.1.31',
    status: 'fail',
  },
  {
    time: '22 juin · 09:30:23',
    user: 'operateur-br@futurekawa.example',
    ip: '192.168.1.52',
    status: 'ok',
  },
  {
    time: '22 juin · 08:14:55',
    user: 'inconnu@externe.com',
    ip: '203.0.113.7',
    status: 'fail',
  },
];

function Badge({ status }) {
  const style =
    status === 'ok'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-rose-50 text-rose-700 border border-rose-200';

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style}`}>
      {status === 'ok' ? 'Réussie' : 'Échec'}
    </span>
  );
}

export default function ConnectionHistory() {
  return (
    <DashboardLayout
      title="Administration"
      user={{
        initials: 'SA',
        name: 'Super Admin',
        role: 'Siège · tous pays',
      }}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Historique des connexions
        </h1>
        <p className="text-slate-500 text-sm sm:text-base">
          Tentatives d'accès à la plateforme, réussies comme échouées.
        </p>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-2xl p-5">
          <p className="text-slate-500 text-sm">Connexions (24h)</p>
          <p className="text-3xl font-bold">23</p>
          <p className="text-emerald-600 text-sm">21 réussies</p>
        </div>

        <div className="bg-white border rounded-2xl p-5">
          <p className="text-slate-500 text-sm">Échecs (24h)</p>
          <p className="text-3xl font-bold text-rose-600">2</p>
          <p className="text-rose-600 text-sm">mots de passe erronés</p>
        </div>

        <div className="bg-white border rounded-2xl p-5">
          <p className="text-slate-500 text-sm">Comptes actifs</p>
          <p className="text-3xl font-bold">5</p>
          <p className="text-slate-500 text-sm">sur 5</p>
        </div>
      </section>

      {/* Table */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-sm">
            <tr>
              <th className="p-4">Horodatage</th>
              <th className="p-4">Compte</th>
              <th className="p-4">IP</th>
              <th className="p-4">Résultat</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log, i) => (
              <tr key={i} className="border-t hover:bg-slate-50">
                <td className="p-4 text-sm text-slate-700">{log.time}</td>
                <td className="p-4 text-sm">{log.user}</td>
                <td className="p-4 font-mono text-sm">{log.ip}</td>
                <td className="p-4">
                  <Badge status={log.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-sm text-slate-500">
        ℹ️ Cet écran sera connecté à un futur endpoint de logs de sécurité.
      </div>
    </DashboardLayout>
  );
}