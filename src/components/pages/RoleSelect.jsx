import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Shield, ClipboardCheck, FileBarChart, LogOut, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const ROLE_MAP = {
  inspector: { title: 'Field Inspector', path: '/inspector', icon: ClipboardCheck, color: 'bg-primary' },
  admin:     { title: 'Administrator',   path: '/admin',     icon: Shield,          color: 'bg-accent' },
  auditor:   { title: 'Auditor',         path: '/auditor',   icon: FileBarChart,    color: 'bg-emerald-600' },
  shipper:   { title: 'Shipper',         path: '/shipper',   icon: Container,       color: 'bg-primary' },
  // Default admin role also maps to admin portal.
  user:      { title: 'Field Inspector', path: '/inspector', icon: ClipboardCheck, color: 'bg-primary' },
};

export default function RoleSelect() {
  const navigate = useNavigate();
  const { user, isLoadingAuth, logout, navigateToLogin, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth) {
      if (!isAuthenticated) {
        navigateToLogin();
        return;
      }
      if (user) {
        const role = user.role?.toLowerCase();
        const mapping = ROLE_MAP[role];
        if (mapping) {
          navigate(mapping.path, { replace: true });
        }
        // Unknown role - stay on page and show fallback
      }
    }
  }, [isLoadingAuth, isAuthenticated, user, navigate, navigateToLogin]);

  if (isLoadingAuth || (isAuthenticated && user && ROLE_MAP[user.role?.toLowerCase()])) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary mx-auto flex items-center justify-center shadow-lg">
            <Container className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Mengalihkan...</p>
        </div>
      </div>
    );
  }

  // Fallback: authenticated but role not recognised
  const role = user?.role?.toLowerCase();
  const RoleIcon = ROLE_MAP[role]?.icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto flex items-center justify-center shadow-lg">
            <Container className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">KontainerCheck</h1>
          {user && (
            <p className="text-sm text-muted-foreground">
              Masuk sebagai <span className="font-semibold text-foreground">{user.full_name || user.email}</span>
            </p>
          )}
        </div>

        <Card className="p-5 border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-destructive">Peran tidak dikenali</p>
              <p className="text-sm text-muted-foreground mt-1">
                Akun Anda memiliki peran <code className="bg-muted px-1 rounded text-xs">{user?.role || 'tidak ada'}</code>.
                Hubungi administrator untuk menetapkan peran yang benar
                (<code className="bg-muted px-1 rounded text-xs">inspector</code>,{' '}
                <code className="bg-muted px-1 rounded text-xs">admin</code>,{' '}
                atau <code className="bg-muted px-1 rounded text-xs">auditor</code>).
              </p>
            </div>
          </div>
        </Card>

        <Button variant="outline" className="w-full gap-2" onClick={() => logout()}>
          <LogOut className="w-4 h-4" /> Keluar
        </Button>
      </div>
    </div>
  );
}
