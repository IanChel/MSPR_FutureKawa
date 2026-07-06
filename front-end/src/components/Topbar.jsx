import React from 'react';
import { Search, Bell, Menu, Globe2 } from 'lucide-react';

export default function Topbar({ setIsSidebarOpen, role = 'super-admin' }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <button
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Console</p>
          <h2 className="text-lg font-bold text-slate-900">
            {role === 'super-admin' ? 'Super Admin Dashboard' : 'Dashboard'}
          </h2>
        </div>
      </div>

      <div className="hidden md:flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-400 w-[360px] focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition">
        <Search className="mr-2 h-4 w-4" />
        <input
          type="text"
          placeholder="Rechercher un lot, un entrepôt, un capteur..."
          className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
          <Globe2 className="h-4 w-4" />
          Monde
        </div>

        <button className="relative rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500"></span>
        </button>

        <div className="hidden h-6 w-px bg-slate-200 sm:block"></div>

        <button className="flex items-center gap-3 rounded-xl p-1 transition hover:bg-slate-100">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=FutureKawaAdmin&backgroundColor=transparent"
            alt="Super Admin"
            className="h-9 w-9 rounded-full border border-slate-200 bg-slate-100"
          />
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold text-slate-800">Sara Haddad</p>
            <p className="text-xs text-slate-400">Super Administratrice</p>
          </div>
        </button>
      </div>
    </header>
  );
}