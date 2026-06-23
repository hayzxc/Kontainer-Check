import React from 'react';
import { Link } from 'react-router-dom';
import { entities } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, Clock, CheckCircle2, XCircle, AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import MetricCard from '@/components/dashboard/MetricCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = ['hsl(35, 90%, 50%)', 'hsl(145, 55%, 42%)', 'hsl(4, 72%, 56%)', 'hsl(40, 90%, 47%)'];

export default function AdminDashboard() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['all-inspections'],
    queryFn: () => entities.InspectionSession.list('-created_date', 100),
  });

  const pending = sessions.filter(s => s.status === 'pending');
  const approved = sessions.filter(s => s.status === 'approved');
  const rejected = sessions.filter(s => s.status === 'rejected');
  const clarification = sessions.filter(s => s.status === 'clarification');

  // Pie chart data
  const statusData = [
    { name: 'Pending', value: pending.length },
    { name: 'Approved', value: approved.length },
    { name: 'Rejected', value: rejected.length },
    { name: 'Clarification', value: clarification.length },
  ].filter(d => d.value > 0);

  // Daily chart (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayStr = format(date, 'yyyy-MM-dd');
    const label = format(date, 'dd MMM');
    const count = sessions.filter(s => s.created_date?.startsWith(dayStr)).length;
    return { label, count };
  });

  return (
    <div className="space-y-6">
      <div className="surface-panel rounded-[1.75rem] p-6 lg:p-8">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Dashboard admin</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">Ringkasan dan monitoring inspeksi kontainer</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Lihat volume inspeksi, distribusi status, dan antrian yang butuh keputusan.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard title="Total Inspeksi" value={sessions.length} icon={ClipboardCheck} variant="primary" />
          <MetricCard title="Menunggu Verifikasi" value={pending.length} icon={Clock} trendLabel={`${pending.length} perlu review`} trend={pending.length > 0 ? 1 : 0} />
          <MetricCard title="Disetujui" value={approved.length} icon={CheckCircle2} />
          <MetricCard title="Ditolak / Klarifikasi" value={rejected.length + clarification.length} icon={AlertTriangle} />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="surface-panel rounded-[1.5rem] p-5 lg:col-span-2">
          <h3 className="mb-4 font-semibold">Inspeksi 7 Hari Terakhir</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" className="text-xs" />
              <YAxis allowDecimals={false} className="text-xs" />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(210, 55%, 24%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="surface-panel rounded-[1.5rem] p-5">
          <h3 className="mb-4 font-semibold">Status Distribusi</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Belum ada data</p>
          )}
        </Card>
      </div>

      {/* Pending Queue Preview */}
      <Card className="surface-panel rounded-[1.5rem] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Antrian Verifikasi Terbaru</h3>
          <Link to="/admin/queue" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
            Lihat Semua <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Tidak ada inspeksi menunggu verifikasi</p>
        ) : (
          <div className="space-y-2">
            {pending.slice(0, 5).map(s => (
              <Link key={s.id} to={`/admin/queue/${s.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-sm">{s.container_id}</p>
                      <p className="text-xs text-muted-foreground">{s.location_name} • {s.inspector_name || 'Inspector'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(s.created_date), 'dd MMM HH:mm')}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
