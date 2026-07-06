import React from 'react';
import DashboardLayout from '../layouts/DashboardLayout';

const roles = ['Super Admin', 'Admin Pays', 'Opérateur', 'Lecteur'];

const permissions = [
  {
    label: 'Consulter stocks & mesures',
    values: [1, 1, 1, 1],
  },
  {
    label: 'Enregistrer un lot',
    values: [1, 1, 1, 0],
  },
  {
    label: 'Acquitter / résoudre une alerte',
    values: [1, 1, 1, 0],
  },
  {
    label: 'Gérer les utilisateurs',
    values: [1, 1, 0, 0],
  },
  {
    label: 'Supprimer un compte',
    values: [1, 0, 0, 0],
  },
  {
    label: 'Accéder à tous les pays',
    values: [1, 0, 0, 0],
  },
  {
    label: "Consulter le journal d'audit",
    values: [1, 1, 0, 0],
  },
];

function Badge({ ok }) {
  return (
    <span
      className={`text-sm font-bold ${
        ok ? 'text-emerald-600' : 'text-slate-400'
      }`}
    >
      {ok ? '✓' : '—'}
    </span>
  );
}

export default function RolesPermissions() {
  return (
    <DashboardLayout
      title="Rôles & permissions"
      user={{
        initials: 'SA',
        name: 'Super Admin',
        role: 'Siège · tous pays',
      }}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Rôles & permissions
        </h1>
        <p className="text-sm sm:text-base text-slate-500">
          Matrice des droits par rôle. Le périmètre (pays) s’applique en plus des permissions.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-500">
                  Permission
                </th>
                {roles.map((role) => (
                  <th
                    key={role}
                    className="px-6 py-4 text-sm font-semibold text-slate-500 text-center"
                  >
                    {role}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {permissions.map((perm) => (
                <tr key={perm.label} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 text-slate-800 font-medium">
                    {perm.label}
                  </td>

                  {perm.values.map((v, i) => (
                    <td key={i} className="px-6 py-4 text-center">
                      <Badge ok={v === 1} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
        ℹ️ En lecture seule dans cette version. L’édition des permissions sera ajoutée plus tard.
      </div>
    </DashboardLayout>
  );
}