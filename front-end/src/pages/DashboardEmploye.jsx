import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { employeeNav } from '../config/navigation';
import { paysApi, formatDate } from '../services/api';
import { useAuth, userDisplayName } from '../context/AuthContext';

const PAYS_LABEL = { BRESIL: 'Brésil', EQUATEUR: 'Équateur', COLOMBIE: 'Colombie' };

function KpiCard({ item }) {
  const toneStyles =
    item.tone === 'danger'
      ? 'border-rose-200 bg-rose-50/60'
      : item.tone === 'warn'
      ? 'border-amber-200 bg-amber-50/60'
      : item.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50/60'
      : 'border-slate-200 bg-white';

  const subColor =
    item.tone === 'danger'
      ? 'text-rose-700'
      : item.tone === 'warn'
      ? 'text-amber-700'
      : item.tone === 'success'
      ? 'text-emerald-700'
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
    type === 'danger'
      ? 'bg-rose-50 text-rose-700 border border-rose-200'
      : type === 'warn'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
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

export default function DashboardEmployee() {
  const { user } = useAuth();
  const paysCode = user?.pays || 'BRESIL';
  const paysLabel = PAYS_LABEL[paysCode] || paysCode;
  const prenom = user?.prenom || userDisplayName(user) || 'utilisateur';

  const [lots, setLots] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [entrepots, setEntrepots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = useCallback(async () => {
    const [lotsData, alertesData, exps] = await Promise.all([
      paysApi.lots(paysCode),
      paysApi.alertes(paysCode),
      paysApi.exploitations(paysCode),
    ]);
    setLots(lotsData || []);
    setAlertes(alertesData || []);

    const allEnts = [];
    await Promise.all(
      (exps || []).map(async (exp) => {
        const ents = await paysApi.entrepots(paysCode, exp.id);
        (ents || []).forEach((e) => allEnts.push(e));
      })
    );
    setEntrepots(allEnts);
  }, [paysCode]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const activeAlerts = alertes.filter((a) => a.statut === 'ACTIVE');
  const recentLots = useMemo(() =>
    [...lots]
      .sort((a, b) => new Date(b.dateStockage) - new Date(a.dateStockage))
      .slice(0, 5),
    [lots]
  );

  const kpis = useMemo(() => [
    {
      label: 'Alertes à traiter',
      value: String(activeAlerts.length),
      sub: activeAlerts.length > 0 ? 'Vérification requise' : 'Aucune anomalie',
      tone: activeAlerts.length > 0 ? 'danger' : 'success',
    },
    {
      label: 'Lots en stock',
      value: String(lots.length),
      sub: `${entrepots.length} entrepôt${entrepots.length > 1 ? 's' : ''}`,
      tone: 'default',
    },
    {
      label: 'Entrepôts',
      value: String(entrepots.length),
      sub: `${paysLabel}`,
      tone: 'success',
    },
    {
      label: 'Proches péremption',
      value: String(lots.filter((l) => l.joursEnStock >= 350).length),
      sub: 'Lots > 350 jours',
      tone: lots.filter((l) => l.joursEnStock >= 350).length > 0 ? 'warn' : 'default',
    },
  ], [activeAlerts, lots, entrepots, paysLabel]);

  const handleAcquitter = async (alert) => {
    setActionLoading(alert.id);
    try {
      await paysApi.acquitterAlerte(paysCode, alert.id);
      await fetchData();
    } catch (e) {
      window.alert(`Erreur : ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResoudre = async (alert) => {
    setActionLoading(alert.id);
    try {
      await paysApi.resoudreAlerte(paysCode, alert.id);
      await fetchData();
    } catch (e) {
      window.alert(`Erreur : ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <DashboardLayout
      title="Périmètre"
      navItems={employeeNav}
      topRightContent={
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            🟢 {paysLabel}
          </span>
        </div>
      }
    >
      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Bonjour {prenom}</h1>
            <p className="mt-2 text-sm text-slate-500">
              Voici ce qui demande votre attention aujourd'hui.
            </p>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {kpis.map((item) => <KpiCard key={item.label} item={item} />)}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Alertes à traiter</h2>
            </div>
            <div className="p-4 space-y-3">
              {activeAlerts.length === 0 ? (
                <p className="text-sm text-slate-500 px-4 py-6 text-center">Aucune alerte active.</p>
              ) : (
                activeAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex flex-col gap-4 rounded-xl border border-slate-200 px-4 py-4 xl:flex-row xl:items-center xl:justify-between"
                  >
                    <div className="flex items-start gap-4">
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
                          {alert.entrepotNom || `Entrepôt #${alert.entrepotId}`} · {formatDate(alert.declencheeAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={actionLoading === alert.id}
                        onClick={() => handleAcquitter(alert)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Acquitter
                      </button>
                      <button
                        disabled={actionLoading === alert.id}
                        onClick={() => handleResoudre(alert)}
                        className="rounded-xl bg-[#234b3f] px-3 py-2 text-sm font-medium text-white hover:bg-[#1d3f35] disabled:opacity-50"
                      >
                        Résoudre
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Mes derniers lots</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em]">Référence</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em]">Entrepôt</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em]">Stocké le</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em]">Jours</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em]">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {recentLots.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm">
                        Aucun lot enregistré.
                      </td>
                    </tr>
                  ) : (
                    recentLots.map((lot) => {
                      const isPerime = lot.statut === 'PERIME' || lot.joursEnStock >= 365;
                      const isNearExpiry = !isPerime && lot.joursEnStock >= 350;
                      const tone = isPerime ? 'danger' : isNearExpiry ? 'warn' : 'ok';
                      const statut = isPerime ? 'Périmé' : isNearExpiry ? 'Proche péremption' : 'Conforme';

                      return (
                        <tr key={lot.id} className="hover:bg-slate-50">
                          <td className="px-5 py-4 text-sm font-medium text-slate-900">{lot.reference}</td>
                          <td className="px-5 py-4 text-sm text-slate-700">{lot.entrepotNom || `#${lot.entrepotId}`}</td>
                          <td className="px-5 py-4 text-sm text-slate-700">
                            {new Date(lot.dateStockage).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-700">{lot.joursEnStock}</td>
                          <td className="px-5 py-4">
                            <StatusBadge type={tone}>{statut}</StatusBadge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
