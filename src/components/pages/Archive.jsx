import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { entities } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Grid3X3, List, ArrowRight, MapPin, Calendar, ScanLine, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import DocumentGenerator from '@/components/shared/DocumentGenerator';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Archive({ isAdmin = false }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['archive-inspections'],
    queryFn: () => entities.InspectionSession.list('-created_date', 500),
  });

  // Fetch all photos for filtered sessions (for PDF export)
  const { data: allPhotos = [] } = useQuery({
    queryKey: ['archive-all-photos'],
    queryFn: () => entities.InspectionPhoto.list('-created_date', 2000),
  });

  // Build photosMap: { sessionId: [photos] }
  const photosMap = useMemo(() => {
    const map = {};
    allPhotos.forEach(p => {
      if (!map[p.session_id]) map[p.session_id] = [];
      map[p.session_id].push(p);
    });
    return map;
  }, [allPhotos]);

  const filtered = sessions
    .filter(s => statusFilter === 'all' || s.status === statusFilter)
    .filter(s => typeFilter === 'all' || s.inspection_type === typeFilter)
    .filter(s => {
      if (!search) return true;
      const q = search.toLowerCase();
      return s.container_id?.toLowerCase().includes(q) || s.location_name?.toLowerCase().includes(q) || s.ocr_serial?.toLowerCase().includes(q);
    });

  const detailPath = isAdmin ? '/admin/archive' : '/inspections';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Arsip Inspeksi</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} inspeksi ditemukan</p>
        </div>
        <DocumentGenerator
          sessions={filtered}
          photosMap={photosMap}
          filename="containers"
        />
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari container ID, lokasi, atau serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
        <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}>
          {viewMode === 'list' ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
        </Button>
      </div>

      {/* Collapsible Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" /> Filter
            <ChevronDown className={cn("w-3 h-3 transition-transform", filtersOpen && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
                <SelectItem value="clarification">Klarifikasi</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Tipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="arrival">Kedatangan</SelectItem>
                <SelectItem value="departure">Keberangkatan</SelectItem>
                <SelectItem value="periodic">Periodik</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="Tidak ditemukan" description="Coba ubah kata kunci atau filter pencarian." />
      ) : viewMode === 'list' ? (
        <div className="space-y-2">
          {filtered.map(s => (
            <Link key={s.id} to={`${detailPath}/${s.id}`}>
              <Card className="p-4 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-sm">{s.container_id}</span>
                      <StatusBadge status={s.status} size="sm" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location_name}</span>
                      <span className="capitalize">{s.inspection_type}</span>
                      <span>{format(new Date(s.created_date), 'dd MMM yyyy')}</span>
                      {s.ocr_serial && <span className="flex items-center gap-1 font-mono"><ScanLine className="w-3 h-3" />{s.ocr_serial}</span>}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(s => (
            <Link key={s.id} to={`${detailPath}/${s.id}`}>
              <Card className="p-4 hover:shadow-md transition-all cursor-pointer h-full">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono font-bold text-sm">{s.container_id}</span>
                </div>
                <StatusBadge status={s.status} size="sm" />
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location_name}</div>
                  <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(s.created_date), 'dd MMM yyyy')}</div>
                  {s.ocr_serial && <div className="font-mono flex items-center gap-1"><ScanLine className="w-3 h-3" />{s.ocr_serial}</div>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
