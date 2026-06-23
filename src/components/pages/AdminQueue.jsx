import React, { useState } from 'react';
import { entities, inspectionSessions } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

export default function AdminQueue() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [comment, setComment] = useState('');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['queue-inspections'],
    queryFn: () => entities.InspectionSession.list('-created_date', 200),
  });

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const { data: photos = [] } = useQuery({
    queryKey: ['session-photos-detail', selectedSessionId],
    queryFn: () => entities.InspectionPhoto.filter({ session_id: selectedSessionId }),
    enabled: !!selectedSessionId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, decision, adminComment }) => inspectionSessions.verify(id, decision, adminComment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-inspections'] });
      setSelectedSessionId(null);
      setActionType(null);
      setComment('');
    },
  });

  const handleVerify = async (decision) => {
    if (!selectedSession) return;
    await updateMutation.mutateAsync({
      id: selectedSession.id,
      decision,
      adminComment: comment,
    });
  };

  const filtered = sessions
    .filter(s => statusFilter === 'all' || s.status === statusFilter)
    .filter(s => !search || s.container_id?.toLowerCase().includes(search.toLowerCase()) || s.location_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Antrian Verifikasi</h1>
        <p className="text-sm text-muted-foreground">Review dan verifikasi inspeksi dari field inspector</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari container ID atau lokasi..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-1"><Clock className="w-3.5 h-3.5" /> Pending</TabsTrigger>
            <TabsTrigger value="clarification" className="gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Klarifikasi</TabsTrigger>
            <TabsTrigger value="all">Semua</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Queue List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Antrian kosong" description="Tidak ada inspeksi yang menunggu verifikasi." />
      ) : (
        <div className="space-y-3">
          {filtered.map(session => (
            <Card
              key={session.id}
              className="p-4 cursor-pointer hover:shadow-md transition-all"
              onClick={() => setSelectedSessionId(session.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold">{session.container_id}</span>
                    <StatusBadge status={session.status} size="sm" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{session.location_name}</span>
                    <span>•</span>
                    <span className="capitalize">{session.inspection_type}</span>
                    <span>•</span>
                    <span>{session.photo_count || 0} foto</span>
                    <span>•</span>
                    <span>{format(new Date(session.created_date), 'dd MMM yyyy HH:mm')}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail / Verify Dialog */}
      <Dialog open={!!selectedSessionId} onOpenChange={(open) => !open && setSelectedSessionId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="font-mono">{selectedSession.container_id}</span>
                  <StatusBadge status={selectedSession.status} />
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Lokasi:</span> <span className="font-medium">{selectedSession.location_name}</span></div>
                  <div><span className="text-muted-foreground">Tipe:</span> <span className="font-medium capitalize">{selectedSession.inspection_type}</span></div>
                  <div><span className="text-muted-foreground">Tanggal:</span> <span className="font-medium">{format(new Date(selectedSession.created_date), 'dd MMM yyyy HH:mm')}</span></div>
                  <div><span className="text-muted-foreground">OCR Serial:</span> <span className="font-mono font-medium">{selectedSession.ocr_serial || '-'}</span></div>
                </div>

                {selectedSession.notes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Catatan Inspector:</p>
                    <p className="text-sm">{selectedSession.notes}</p>
                  </div>
                )}

                {/* Photos */}
                <div>
                  <p className="text-sm font-medium mb-2">Foto ({photos.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map(photo => (
                      <div key={photo.id} className="relative rounded-lg overflow-hidden aspect-[4/3]">
                        <img src={photo.photo_url} alt={photo.photo_angle} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                          <span className="text-white text-[10px] capitalize">{photo.photo_angle}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action */}
                {(selectedSession.status === 'pending' || selectedSession.status === 'clarification') && (
                  <div className="space-y-3 pt-2 border-t">
                    <Textarea
                      placeholder="Komentar (wajib untuk tolak/klarifikasi)..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => handleVerify('approve')}>
                        <CheckCircle2 className="w-4 h-4" /> Setujui
                      </Button>
                      <Button variant="destructive" className="flex-1 gap-2" onClick={() => handleVerify('reject')} disabled={!comment}>
                        <XCircle className="w-4 h-4" /> Tolak
                      </Button>
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => handleVerify('clarify')} disabled={!comment}>
                        <AlertTriangle className="w-4 h-4" /> Klarifikasi
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
