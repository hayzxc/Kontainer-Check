import React, { useState } from 'react';
import { entities } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { FileBarChart, Download, FileText, Table2, TrendingUp, MapPin, Container } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import MetricCard from '@/components/dashboard/MetricCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, subDays } from 'date-fns';

export default function AdminReports() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['reports-inspections'],
    queryFn: () => entities.InspectionSession.list('-created_date', 500),
  });

  // Location stats
  const locationStats = {};
  sessions.forEach(s => {
    const loc = s.location_name || 'Unknown';
    if (!locationStats[loc]) locationStats[loc] = 0;
    locationStats[loc]++;
  });
  const topLocations = Object.entries(locationStats).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count }));

  // Type stats
  const typeStats = { arrival: 0, departure: 0, periodic: 0 };
  sessions.forEach(s => { if (typeStats[s.inspection_type] !== undefined) typeStats[s.inspection_type]++; });

  // Daily trend last 14 days
  const dailyTrend = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dayStr = format(date, 'yyyy-MM-dd');
    return {
      date: format(date, 'dd/MM'),
      count: sessions.filter(s => s.created_date?.startsWith(dayStr)).length,
    };
  });

  const handleExportCSV = () => {
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ['Container ID', 'Tipe', 'Lokasi', 'Status', 'OCR Serial', 'Tanggal'];
    const rows = sessions.map(s => [
      s.container_id, s.inspection_type, s.location_name, s.status, s.ocr_serial || '', format(new Date(s.created_date), 'yyyy-MM-dd HH:mm')
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(escapeCSV).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspeksi_report_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Laporan</h1>
          <p className="text-sm text-muted-foreground">Analisis dan export data inspeksi</p>
        </div>
        <Button onClick={handleExportCSV} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard title="Kedatangan" value={typeStats.arrival} icon={Container} />
        <MetricCard title="Keberangkatan" value={typeStats.departure} icon={Container} />
        <MetricCard title="Periodik" value={typeStats.periodic} icon={Container} />
      </div>

      {/* Trend Chart */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">Tren Inspeksi (14 Hari)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dailyTrend}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis allowDecimals={false} className="text-xs" />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="hsl(210, 55%, 24%)" strokeWidth={2} dot={{ fill: 'hsl(210, 55%, 24%)' }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Top Locations */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">Lokasi Terbanyak</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={topLocations} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" allowDecimals={false} className="text-xs" />
            <YAxis type="category" dataKey="name" className="text-xs" width={120} />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(40, 90%, 47%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
