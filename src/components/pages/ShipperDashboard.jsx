import React from 'react';
import { Link } from 'react-router-dom';
import { entities } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Plus, CheckCircle2, XCircle, AlertTriangle, Clock, Bell, Package, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

function NotifBanner({ session }) {
  if (session.status === 'approved') {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-emerald-800 text-sm">Kontainer <span className="font-mono">{session.container_id}</span> - Disetujui</p>
          <p className="text-xs text-emerald-600 mt-0.5">Foto verifikasi Anda telah disetujui oleh admin.</p>
        </div>
      </div>
    );
  }
  if (session.status === 'rejected') {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
        <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-red-800 text-sm">Kontainer <span className="font-mono">{session.container_id}</span> - Ditolak</p>
          {session.admin_comment && <p className="text-xs text-red-600 mt-0.5">Alasan: {session.admin_comment}</p>}
        </div>
      </div>
    );
  }
  if (session.status === 'clarification') {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200">
        <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-orange-800 text-sm">Kontainer <span className="font-mono">{session.container_id}</span> - Perlu Revisi</p>
          {session.admin_comment && <p className="text-xs text-orange-600 mt-0.5">{session.admin_comment}</p>}
        </div>
      </div>
    );
  }
  return null;
}

export default function ShipperDashboard() {
  const { user } = useAuth();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['shipper-sessions', user?.id],
    queryFn: () => entities.InspectionSession.filter({ created_by_id: user.id }, '-created_date', 100),
    enabled: !!user,
  });

  const notifications = sessions.filter(s => ['approved', 'rejected', 'clarification'].includes(s.status));
  const pending = sessions.filter(s => s.status === 'pending' || s.status === 'draft');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Shipper</h1>
          <p className="text-sm text-muted-foreground">Kelola pengiriman foto verifikasi kontainer Anda</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Link to="/shipper/new">
            <Button variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> Satu Kontainer
            </Button>
          </Link>
          <Link to="/shipper/batch">
            <Button className="gap-2">
              <Layers className="w-4 h-4" /> Kirim Batch
            </Button>
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Notifikasi Terbaru</h2>
            <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{notifications.length}</span>
          </div>
          <div className="space-y-2">
            {notifications.slice(0, 5).map(s => <NotifBanner key={s.id} session={s} />)}
          </div>
        </div>
      )}

      {/* All Submissions */}
      <div>
        <h2 className="font-semibold text-sm mb-3">Semua Pengiriman ({sessions.length})</h2>
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Belum ada pengiriman"
            description="Kirim foto verifikasi kontainer pertama Anda."
          />
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-sm">{s.container_id}</span>
                      <StatusBadge status={s.status} size="sm" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{s.location_name}</span>
                      <span>•</span>
                      <span className="capitalize">{s.inspection_type}</span>
                      <span>•</span>
                      <span>{s.photo_count || 0} foto</span>
                      <span>•</span>
                      <span>{format(new Date(s.created_date), 'dd MMM yyyy HH:mm')}</span>
                    </div>
                    {s.admin_comment && (s.status === 'rejected' || s.status === 'clarification') && (
                      <p className="text-xs text-orange-600 mt-1 italic">"{s.admin_comment}"</p>
                    )}
                  </div>
                  {s.status === 'pending' && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" /> Menunggu
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
