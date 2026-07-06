import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Menu, LogOut } from 'lucide-react';
import { useAuth, userInitials, userDisplayName, userRoleLabel } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { superAdminNav, adminPaysNav, employeeNav } from '../config/navigation';

export default function DashboardLayout({
  children,
  navItems = [],
  title = 'Vue consolidée',
  topTabs = [],
  activeTab = 'all',
  onTabChange = () => {},
  user: userProp,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();

  const resolvedUser = userProp || {
    initials: userInitials(authUser),
    name: userDisplayName(authUser),
    role: userRoleLabel(authUser),
  };

  const roles = authUser?.roles || [];
  const resolvedNavItems = navItems.length > 0 ? navItems : (
    roles.includes('SUPER_ADMIN') ? superAdminNav :
    roles.includes('ADMIN_PAYS') ? adminPaysNav :
    employeeNav
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} navItems={resolvedNavItems} />

      <div className="lg:ml-72 flex flex-col min-h-screen">
        <header className="h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="text-lg sm:text-xl font-medium text-slate-700">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {topTabs.length > 0 && (
              <div className="hidden md:flex items-center bg-slate-100 border border-slate-200 rounded-full p-1">
                {topTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange(tab.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center border border-emerald-200">
                {resolvedUser.initials}
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="font-semibold text-slate-800">{resolvedUser.name}</div>
                <div className="text-sm text-slate-400">{resolvedUser.role}</div>
              </div>
              <button
                onClick={handleLogout}
                title="Se déconnecter"
                className="ml-1 p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
