import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlertsProvider } from './context/AlertsContext';

import Login from './pages/Login';
import DashboardSuperAdmin from './pages/DashboardSuperAdmin';
import DashboardAdminPays from './pages/DashboardAdminPays';
import DashboardEmploye from './pages/DashboardEmploye';
import CountriesManagement from './pages/CountriesManagement';
import AlertsPage from './pages/AlertsPage';
import MeasuresPage from './pages/MeasuresPage';
import UsersManagement from './pages/UsersManagement';
import RolesPermissions from './pages/RolesPermissions';
import Audit from './pages/Audit';
import SystemSettings from './pages/SystemSettings';
import ConnectionHistory from './pages/ConnectionHistory';
import Warehouses from './pages/Warehouses';
import Sensors from './pages/Sensors';
import StocksPage from './pages/StocksPage';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-slate-500 text-sm">Chargement…</div>
    </div>
  );
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.some((r) => user.roles?.includes(r))) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  const roles = user.roles || [];
  if (roles.includes('SUPER_ADMIN')) return <Navigate to="/dashboard/super-admin" replace />;
  if (roles.includes('ADMIN_PAYS')) return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/employee/dashboard" replace />;
}

function App() {
  return (
    <AuthProvider>
      <AlertsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard/super-admin"
            element={
              <ProtectedRoute roles={['SUPER_ADMIN']}>
                <DashboardSuperAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={['ADMIN_PAYS']}>
                <DashboardAdminPays />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/dashboard"
            element={
              <ProtectedRoute>
                <DashboardEmploye />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pays"
            element={
              <ProtectedRoute roles={['SUPER_ADMIN']}>
                <CountriesManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stocks"
            element={
              <ProtectedRoute roles={['SUPER_ADMIN']}>
                <StocksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alertes"
            element={
              <ProtectedRoute>
                <AlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mesures"
            element={
              <ProtectedRoute>
                <MeasuresPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN_PAYS']}>
                <UsersManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles"
            element={
              <ProtectedRoute roles={['SUPER_ADMIN']}>
                <RolesPermissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN_PAYS']}>
                <Audit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute roles={['SUPER_ADMIN']}>
                <SystemSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/connexionhistory"
            element={
              <ProtectedRoute>
                <ConnectionHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouses"
            element={
              <ProtectedRoute>
                <Warehouses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sensors"
            element={
              <ProtectedRoute>
                <Sensors />
              </ProtectedRoute>
            }
          />

          {/* Chemins utilisés par la navigation admin pays / employé
              (alias vers les mêmes pages que les routes ci-dessus) */}
          <Route
            path="/admin/stocks"
            element={
              <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN_PAYS']}>
                <StocksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/entrepots"
            element={
              <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN_PAYS']}>
                <Warehouses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/capteurs"
            element={
              <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN_PAYS']}>
                <Sensors />
              </ProtectedRoute>
            }
          />
          <Route
            path="/utilisateurs"
            element={
              <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN_PAYS']}>
                <UsersManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lots"
            element={
              <ProtectedRoute>
                <StocksPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      </AlertsProvider>
    </AuthProvider>
  );
}

export default App;
