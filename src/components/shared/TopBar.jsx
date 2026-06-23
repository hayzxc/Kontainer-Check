import React from 'react';
import { Menu, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const roleLabelMap = {
  admin: 'Administrator',
  auditor: 'Auditor',
  shipper: 'Shipper',
  inspector: 'Inspector',
};

export default function TopBar({ role = 'inspector', userName = 'User', onMenuToggle }) {
  const { user, logout } = useAuth();
  const displayName = user?.full_name || user?.email || userName;
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onMenuToggle} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden flex-col sm:flex">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {roleLabelMap[role] || 'Workspace'}
            </span>
            <span className="text-sm font-medium text-foreground/80">
              KontainerCheck operational console
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/80 px-2.5 py-1.5 shadow-sm sm:flex">
            <Avatar className="h-7 w-7 rounded-full">
              <AvatarFallback className="rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="max-w-40 leading-tight">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-[11px] text-muted-foreground">{roleLabelMap[role] || 'Workspace'}</p>
            </div>
            <UserRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="gap-1.5 text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
