import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';

const COUNTRIES = ['Brésil', 'Équateur', 'Colombie'];

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
        active
          ? 'bg-emerald-100 text-emerald-900'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function Input({ label, value }) {
  return (
    <div>
      <label className="text-sm text-slate-500">{label}</label>
      <input
        defaultValue={value}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}

export default function SystemSettings() {
  const [country, setCountry] = useState('Brésil');

  return (
    <DashboardLayout
      title="Paramètres système"
      user={{
        initials: 'SA',
        name: 'Super Admin',
        role: 'Siège · tous pays',
      }}
    >
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Paramètres système
        </h1>
        <p className="text-slate-500">
          Seuils de conformité et comportement des alertes, par pays.
        </p>
      </div>

      {/* TABS PAYS */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {COUNTRIES.map((c) => (
          <TabButton
            key={c}
            active={country === c}
            onClick={() => setCountry(c)}
          >
            {c}
          </TabButton>
        ))}
      </div>

      {/* SEUILS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Seuils de conformité — {country}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Température cible (°C)" value="29" />
          <Input label="Tolérance température (± °C)" value="3" />
          <Input label="Humidité cible (%)" value="55" />
          <Input label="Tolérance humidité (± %)" value="2" />
        </div>
      </div>

      {/* ALERTES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Comportement des alertes
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input label="Mesures consécutives avant ouverture" value="3" />
          <Input label="Mesures consécutives avant résolution" value="3" />
          <Input label="Intervalle de rappel (minutes)" value="30" />
          <Input label="Seuil de péremption (jours)" value="365" />
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <p className="font-medium text-slate-900">
              Notifications par e-mail
            </p>
            <p className="text-sm text-slate-500">
              Envoyer un e-mail au responsable du pays
            </p>
          </div>

          <input type="checkbox" defaultChecked className="w-5 h-5" />
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end gap-3">
        <button className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
          Réinitialiser
        </button>
        <button className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
          Enregistrer
        </button>
      </div>

      {/* INFO */}
      <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
        ℹ️ Aujourd’hui ces valeurs vivent dans les fichiers de configuration.
        Les rendre éditables nécessite un endpoint backend.
      </div>
    </DashboardLayout>
  );
}