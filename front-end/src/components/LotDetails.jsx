import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Activity, ThermometerSun, Droplets, X } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function LotDetails({ lot, onClose }) {
  if (!lot) return null;

  // Configuration Chart.js commune (Dark mode)
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(51, 65, 85, 0.2)' },
        ticks: { color: '#64748b' }
      },
      y: {
        grid: { color: 'rgba(51, 65, 85, 0.2)' },
        ticks: { color: '#64748b' }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  const tempChartData = {
    labels: lot.history.map(d => d.date),
    datasets: [
      {
        label: 'Température (°C)',
        data: lot.history.map(d => d.temp),
        borderColor: '#f43f5e', // rose-500
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
      }
    ]
  };

  const humChartData = {
    labels: lot.history.map(d => d.date),
    datasets: [
      {
        label: 'Humidité (%)',
        data: lot.history.map(d => d.hum),
        borderColor: '#3b82f6', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
      }
    ]
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 mt-6 shadow-lg relative">
      
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-600" />
          Détails IoT du Lot {lot.id}
        </h2>
        <p className="text-slate-500 text-sm mt-1">Origine : {lot.country} &bull; Historique des 7 derniers jours</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Température */}
        <div className="bg-slate-100/30 border border-slate-300/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
              <ThermometerSun className="w-4 h-4 text-rose-600" />
              Évolution Température
            </h3>
            <span className="text-xl font-bold text-slate-900">{lot.currentTemp}°C</span>
          </div>
          <div className="h-48 w-full">
            <Line options={commonOptions} data={tempChartData} />
          </div>
        </div>

        {/* Humidité */}
        <div className="bg-slate-100/30 border border-slate-300/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-400" />
              Évolution Humidité
            </h3>
            <span className="text-xl font-bold text-slate-900">{lot.currentHum}%</span>
          </div>
          <div className="h-48 w-full">
            <Line options={commonOptions} data={humChartData} />
          </div>
        </div>

      </div>
    </div>
  );
}