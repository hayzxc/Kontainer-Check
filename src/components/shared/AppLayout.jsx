import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import { cn } from '@/lib/utils';

export default function AppLayout({ role = 'inspector', userName = 'User' }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell noise-overlay min-h-dvh bg-background text-foreground">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      {/* Sidebar - hidden on mobile unless toggled */}
      <div className={cn(
        "hidden lg:block",
        mobileOpen && "!block"
      )}>
        <AppSidebar 
          role={role} 
          collapsed={collapsed} 
          onToggle={() => setCollapsed(!collapsed)} 
        />
      </div>

      {/* Main content */}
      <div className={cn(
        "min-w-0 transition-all duration-300",
        collapsed ? "lg:ml-16" : "lg:ml-64"
      )}>
        <TopBar role={role} userName={userName} onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <main className="mx-auto w-full max-w-[90rem] px-4 py-4 lg:px-6 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
