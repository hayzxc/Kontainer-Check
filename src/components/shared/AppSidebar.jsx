import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, ClipboardCheck, Archive, Users, FileBarChart, 
  Settings, LogOut, Container, ChevronLeft, ChevronRight, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const inspectorNav = [
  { label: 'Dashboard', path: '/inspector', icon: LayoutDashboard },
  { label: 'Inspeksi Baru', path: '/inspections/new', icon: ClipboardCheck },
  { label: 'Arsip Saya', path: '/my-archive', icon: Archive },
];

const adminNav = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Antrian Verifikasi', path: '/admin/queue', icon: ClipboardCheck },
  { label: 'Manajemen User', path: '/admin/users', icon: Users },
  { label: 'Laporan', path: '/admin/reports', icon: FileBarChart },
  { label: 'Arsip', path: '/admin/archive', icon: Archive },
];

const auditorNav = [
  { label: 'Arsip Inspeksi', path: '/auditor', icon: Archive },
  { label: 'Laporan', path: '/auditor/reports', icon: FileBarChart },
];

const shipperNav = [
  { label: 'Dashboard', path: '/shipper', icon: LayoutDashboard },
  { label: 'Satu Kontainer', path: '/shipper/new', icon: ClipboardCheck },
  { label: 'Batch Kontainer', path: '/shipper/batch', icon: Container },
];

export default function AppSidebar({ role = 'inspector', collapsed, onToggle }) {
  const location = useLocation();
  
  const navItems = role === 'admin' ? adminNav : role === 'auditor' ? auditorNav : role === 'shipper' ? shipperNav : inspectorNav;

  const roleLabel = role === 'admin' ? 'Administrator' : role === 'auditor' ? 'Auditor' : role === 'shipper' ? 'Shipper' : 'Inspector';
  const roleIcon = role === 'admin' ? Shield : role === 'auditor' ? FileBarChart : Container;
  const RoleIcon = roleIcon;

  return (
    <aside aria-label="Navigasi utama" className={cn(
      "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/10 transition-all duration-300",
      "bg-[linear-gradient(180deg,hsl(215_36%_13%_/_0.98),hsl(215_34%_10%_/_0.98))] text-[hsl(210,15%,90%)] shadow-[10px_0_30px_hsl(215_36%_10%_/_0.18)] backdrop-blur-xl",
      collapsed ? "w-full max-w-xs lg:w-16" : "w-full max-w-xs lg:w-64"
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-accent shadow-[0_10px_20px_hsl(34_84%_48%_/_0.22)]">
          <Container className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="truncate text-sm font-semibold text-white">KontainerCheck</h1>
            <p className="truncate text-[10px] text-white/50">Verification system</p>
          </div>
        )}
      </div>

      {/* Role Badge */}
      {!collapsed && (
        <div className="mx-3 mt-4 mb-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <RoleIcon className="w-4 h-4 text-accent" />
          <span className="text-xs font-medium tracking-wide text-accent">{roleLabel}</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 mt-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-white/12 text-white shadow-[0_10px_24px_hsl(0_0%_0%_/_0.12)]" 
                  : "text-white/62 hover:bg-white/8 hover:text-white",
                collapsed && "justify-center px-0"
              )}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <span className="absolute inset-y-2 left-1 w-1 rounded-full bg-accent" aria-hidden="true" />
              )}
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Toggle */}
      <div className="px-2 pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full rounded-2xl text-white/45 hover:bg-white/8 hover:text-white"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
    </aside>
  );
}
