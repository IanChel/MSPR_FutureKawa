import React from 'react';
import { AlertTriangle, Clock, CheckCircle2, ChevronRight } from 'lucide-react';

const IDEAL_CONDITIONS = {
  Brazil: { minTemp: 18, maxTemp: 22, minHum: 50, maxHum: 60 },
  Colombia: { minTemp: 16, maxTemp: 20, minHum: 55, maxHum: 65 },
  Ecuador: { minTemp: 17, maxTemp: 21, minHum: 60, maxHum: 70 },
};

function isQualityAlert(country, temp, hum) {
  const condition = IDEAL_CONDITIONS[country];
  if (!condition) return false;
  
  const tempAlert = temp < condition.minTemp || temp > condition.maxTemp;
  const humAlert = hum < condition.minHum || hum > condition.maxHum;
  return tempAlert || humAlert;
}

export default function LotsTable({ lots, onSelectLot }) {
  // Sort lots by storageDate (oldest first for FIFO)
  const sortedLots = [...lots].sort((a, b) => new Date(a.storageDate) - new Date(b.storageDate));

  const currentDate = new Date(); // En contexte "2026-06-15"

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium">ID Lot</th>
              <th className="px-6 py-4 font-medium">Pays / Entrepôt</th>
              <th className="px-6 py-4 font-medium">Date de Stockage</th>
              <th className="px-6 py-4 font-medium">Statut Qualité</th>
              <th className="px-6 py-4 font-medium">Alertes</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedLots.map((lot) => {
              const storageDateObj = new Date(lot.storageDate);
              const daysInStorage = Math.floor((currentDate - storageDateObj) / (1000 * 60 * 60 * 24));
              const isExpired = daysInStorage > 365;
              const hasQualityAlert = isQualityAlert(lot.country, lot.currentTemp, lot.currentHum);

              return (
                <tr key={lot.id} className="hover:bg-slate-100/30 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800">{lot.id}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                       {lot.country}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4 text-slate-500" />
                      {storageDateObj.toLocaleDateString('fr-FR')}
                      <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-md ${isExpired ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                        {daysInStorage} j
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-xs">
                      <span className={`${lot.currentTemp < IDEAL_CONDITIONS[lot.country].minTemp || lot.currentTemp > IDEAL_CONDITIONS[lot.country].maxTemp ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>Temp: {lot.currentTemp}°C</span>
                      <span className={`${lot.currentHum < IDEAL_CONDITIONS[lot.country].minHum || lot.currentHum > IDEAL_CONDITIONS[lot.country].maxHum ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>Hum: {lot.currentHum}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {isExpired && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-500/20 text-amber-600 text-xs font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" /> Péremption (&gt;1 an)
                        </span>
                      )}
                      {hasQualityAlert && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-500/20 text-rose-600 text-xs font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" /> Anomalie Qualité
                        </span>
                      )}
                      {!isExpired && !hasQualityAlert && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Optimal
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => onSelectLot(lot)}
                      className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent transition-colors"
                      title="Voir les détails IoT"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}