import React from 'react';
import { Coffee } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAlerts } from '../context/AlertsContext';

export default function Sidebar({
  isOpen,
  setIsOpen,
  navItems = [],
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeAlertsCount } = useAlerts();

  const mainLinks = navItems.filter((item) => item.group === 'main');
  const adminLinks = navItems.filter((item) => item.group === 'admin');

  const renderLinks = (links) =>
    links.map((item) => {
      const Icon = item.icon;
      const isActive = location.pathname === item.path;
      const isAlertes = item.label === 'Alertes';

      return (
        <button
          key={item.label}
          onClick={() => {
            navigate(item.path);
            if (setIsOpen) setIsOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
            isActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Icon className="w-5 h-5 shrink-0" />
          <span className="font-medium text-sm flex-1 text-left">{item.label}</span>
          {isAlertes && activeAlertsCount > 0 && (
            <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white leading-none">
              {activeAlertsCount > 99 ? '99+' : activeAlertsCount}
            </span>
          )}
        </button>
      );
    });

  return (
    <aside
      className={`fixed top-0 left-0 z-50 h-screen w-72 bg-white border-r border-slate-200 transition-transform duration-300 flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-20 border-b border-slate-200">
        <div className="bg-emerald-500/15 p-2.5 rounded-xl border border-emerald-200">
          <Coffee className="w-5 h-5 text-emerald-600" />
        </div>

        <div>
          <p className="text-xl font-bold text-slate-900">FutureKawa</p>
          <p className="text-xs text-slate-400">Console d'administration</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">

        {/* Navigation */}
        <div className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>

        <nav className="space-y-1">
          {renderLinks(mainLinks)}
        </nav>

        {/* Administration */}
        {adminLinks.length > 0 && (
          <>
            <div className="mt-8 mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Administration
            </div>

            <nav className="space-y-1">
              {renderLinks(adminLinks)}
            </nav>
          </>
        )}
      </div>

      <div className="border-t border-slate-200 p-4 text-sm text-slate-400">
        v1.0 · FutureKawa
      </div>
    </aside>
  );
}