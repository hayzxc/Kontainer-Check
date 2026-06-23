import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { entities } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ClipboardCheck, Clock, CheckCircle2, AlertTriangle, ArrowRight, Archive, CheckSquare, Square, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import MetricCard from '@/components/dashboard/MetricCard';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function InspectorDashboard() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['my-inspections'],
    queryFn: () => entities.InspectionSession.list('-created_date', 50),
  });

  // Only show non-archived in active list
  const activeSessions = sessions.filter(s => !s.archived);

  const pending = activeSessions.filter(s => s.status === 'pending').length;
  const approved = activeSessions.filter(s => s.status === 'approved').length;
  const clarification = activeSessions.filter(s => s.status === 'clarification').length;

  const archiveMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => entities.InspectionSession.update(id, { archived: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-inspections'] });
      setSelected(new Set());
      setSelectMode(false);
    },
  });

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === activeSessions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(activeSessions.map(s => s.id)));
    }
  };

  const handleArchive = () => {
    archiveMutation.mutate([...selected]);
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Hero CTA */}
      <div className="surface-panel relative overflow-hidden rounded-[1.75rem] p-6 lg:p-8">
        <div className="absolute inset-y-0 right-0 hidden w-[38%] bg-[radial-gradient(circle_at_top_right,hsl(34_84%_48%_/_0.10),transparent_60%),linear-gradient(135deg,transparent_0%,transparent_48%,hsl(210_56%_24%_/_0.06)_48%,hsl(210_56%_24%_/_0.06)_50%,transparent_50%,transparent_100%)] bg-[length:24px_24px] lg:block" />
        <div className="absolute bottom-0 right-[38%] h-1 w-24 bg-accent" />
        <div className="relative z-10">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ruang kerja inspector</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">Selamat datang</h1>
          <p className="mb-5 mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Mulai inspeksi kontainer baru atau lihat status inspeksi yang telah dilakukan.
          </p>
          <Link to="/inspections/new">
            <Button size="lg" className="gap-2 bg-primary text-primary-foreground shadow-[0_10px_24px_hsl(210_56%_24%_/_0.18)] hover:bg-primary/90 font-semibold">
              <Plus className="w-5 h-5" /> Mulai Inspeksi Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard title="Aktif" value={activeSessions.length} icon={ClipboardCheck} />
        <MetricCard title="Pending" value={pending} icon={Clock} />
        <MetricCard title="Disetujui" value={approved} icon={CheckCircle2} />
        <MetricCard title="Klarifikasi" value={clarification} icon={AlertTriangle} />
      </div>

      {/* Inspections List */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Inspeksi Aktif</h2>
          <div className="flex items-center gap-2">
            {!selectMode ? (
              <>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSelectMode(true)}>
                  <CheckSquare className="w-4 h-4" /> Pilih
                </Button>
                <Link to="/my-archive" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
                  Arsip <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={toggleAll}>
                  {selected.size === activeSessions.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  Semua
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-primary"
                  disabled={selected.size === 0 || archiveMutation.isPending}
                  onClick={handleArchive}
                >
                  {archiveMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Archive className="w-4 h-4" />}
                  Arsipkan ({selected.size})
                </Button>
                <Button variant="ghost" size="icon" onClick={exitSelectMode}>
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : activeSessions.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Tidak ada inspeksi aktif"
            description="Semua inspeksi telah diarsipkan atau belum ada inspeksi baru."
            action={
              <Link to="/my-archive">
                <Button variant="outline" size="sm" className="gap-1.5"><Archive className="w-4 h-4" /> Lihat Arsip</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {activeSessions.slice(0, 20).map(session => {
              const isSelected = selected.has(session.id);
              return (
                <div key={session.id} className="relative">
                  {selectMode ? (
                    <Card
                      className={cn(
                        'surface-panel cursor-pointer border-2 p-4 transition-all duration-200',
                        isSelected ? 'border-primary/25 bg-primary/6' : 'border-transparent hover:-translate-y-0.5 hover:shadow-[0_16px_30px_hsl(210_56%_24%_/_0.10)]'
                      )}
                      onClick={() => toggleSelect(session.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                          isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                        )}>
                          {isSelected && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-sm">{session.container_id}</span>
                            <StatusBadge status={session.status} size="sm" />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{session.location_name}</span>
                            <span>•</span>
                            <span className="capitalize">{session.inspection_type}</span>
                            <span>•</span>
                            <span>{format(new Date(session.created_date), 'dd MMM yyyy HH:mm')}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Link to={`/inspections/${session.id}`}>
                      <Card className="surface-panel group cursor-pointer p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_hsl(210_56%_24%_/_0.10)]">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-bold text-sm">{session.container_id}</span>
                              <StatusBadge status={session.status} size="sm" />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{session.location_name}</span>
                              <span>•</span>
                              <span className="capitalize">{session.inspection_type}</span>
                              <span>•</span>
                              <span>{format(new Date(session.created_date), 'dd MMM yyyy HH:mm')}</span>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </Card>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
