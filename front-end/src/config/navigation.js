import {
  LayoutDashboard,
  Package,
  TriangleAlert,
  Activity,
  Warehouse,
  Cpu,
  Users,
  ShieldCheck,
  Globe,
  FileText,
  Settings,
} from 'lucide-react';

export const superAdminNav = [
  { label: 'Tableau de bord', path: '/dashboard/super-admin', icon: LayoutDashboard, group: 'main' },
  { label: 'Pays', path: '/pays', icon: Globe, group: 'main' },
  { label: 'Stocks & lots', path: '/stocks', icon: Package, group: 'main' },
  { label: 'Alertes', path: '/alertes', icon: TriangleAlert, group: 'main' },
  { label: 'Mesures', path: '/mesures', icon: Activity, group: 'main' },

  { label: 'Utilisateurs', path: '/users', icon: Users, group: 'admin' },
  { label: 'Rôles & permissions', path: '/roles', icon: ShieldCheck, group: 'admin' },
  { label: 'Audit', path: '/audit', icon: FileText, group: 'admin' },
  { label: 'Paramètres', path: '/settings', icon: Settings, group: 'admin' },
];

export const adminPaysNav = [
  { label: 'Tableau de bord', path: '/admin/dashboard', icon: LayoutDashboard, group: 'main' },
  { label: 'Stocks & lots', path: '/admin/stocks', icon: Package, group: 'main' },
  { label: 'Alertes', path: '/alertes', icon: TriangleAlert, group: 'main' },
  { label: 'Mesures', path: '/mesures', icon: Activity, group: 'main' },
  { label: 'Entrepôts', path: '/entrepots', icon: Warehouse, group: 'main' },
  { label: 'Capteurs', path: '/capteurs', icon: Cpu, group: 'main' },

  { label: 'Utilisateurs', path: '/utilisateurs', icon: Users, group: 'admin' },
  { label: 'Audit', path: '/audit', icon: FileText, group: 'admin' },
];

export const employeeNav = [
  { label: 'Mon tableau de bord', path: '/employee/dashboard', icon: LayoutDashboard,group: 'main'  },
  { label: 'Lots', path: '/lots', icon: Package, group: 'main' },
  { label: 'Alertes', path: '/alertes', icon: TriangleAlert, group: 'main' },
  { label: 'Mesures', path: '/mesures', icon: Activity, group: 'main' },
];