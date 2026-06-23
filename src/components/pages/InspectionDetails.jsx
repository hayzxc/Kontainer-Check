import React from 'react';
import { useNavigate } from 'react-router-dom';
import { entities } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Calendar, Container, Camera, ScanLine, AlertCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import DocumentGenerator from '@/components/shared/DocumentGenerator';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogTrigger
} from '@/components/ui/dialog';

export default function InspectionDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split('/');
  const sessionId = pathParts[pathParts.length - 1];
  const navigate = useNavigate();

  const { data: session, isLoading: loadingSession } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => entities.InspectionSession.filter({ id: sessionId }),
    select: (data) => data[0],
  });

  const { data: photos = [], isLoading: loadingPhotos } = useQuery({
    queryKey: ['session-photos', sessionId],
    queryFn: () => entities.InspectionPhoto.filter({ session_id: sessionId }),
  });

  if (loadingSession) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-muted-foreground">Inspeksi tidak ditemukan</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">Kembali</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold font-mono truncate">{session.container_id}</h1>
              <StatusBadge status={session.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(new Date(session.created_date), 'dd MMMM yyyy, HH:mm')}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <DocumentGenerator
            sessions={[session]}
            photosMap={{ [session.id]: photos }}
            filename={session.container_id}
          />
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Container className="w-4 h-4" />
            <span className="text-xs">Tipe</span>
          </div>
          <p className="font-semibold text-sm capitalize">{session.inspection_type}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-xs">Lokasi</span>
          </div>
          <p className="font-semibold text-sm truncate">{session.location_name}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Camera className="w-4 h-4" />
            <span className="text-xs">Foto</span>
          </div>
          <p className="font-semibold text-sm">{photos.length} foto</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ScanLine className="w-4 h-4" />
            <span className="text-xs">OCR Serial</span>
          </div>
            <p className="font-mono font-semibold text-sm">{session.ocr_serial || '-'}</p>
        </Card>
      </div>

      {/* Admin Comment */}
      {session.admin_comment && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <p className="text-sm font-medium text-amber-800 mb-1">Komentar Admin:</p>
          <p className="text-sm text-amber-700">{session.admin_comment}</p>
        </Card>
      )}

      {/* Photos Gallery */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">Foto Inspeksi</h3>
        {loadingPhotos ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="aspect-[4/3] rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {photos.map(photo => (
              <Dialog key={photo.id}>
                <DialogTrigger asChild>
                  <div className="relative rounded-xl overflow-hidden cursor-pointer group aspect-[4/3]">
                    <img src={photo.photo_url} alt={photo.photo_angle} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <span className="text-white text-xs font-medium capitalize">{photo.photo_angle}</span>
                      {photo.ocr_detected_serial && (
                        <div className="flex items-center gap-1 mt-1">
                          <ScanLine className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300 text-[10px] font-mono">{photo.ocr_confirmed_serial || photo.ocr_detected_serial}</span>
                        </div>
                      )}
                    </div>
                    {photo.damage_labels?.length > 0 && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-destructive text-destructive-foreground text-[10px]">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {photo.damage_labels.length} kerusakan
                        </Badge>
                      </div>
                    )}
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-3xl p-0 overflow-hidden">
                  <img src={photo.photo_url} alt={photo.photo_angle} className="w-full h-auto" />
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}
      </Card>

      {/* Notes */}
      {session.notes && (
        <Card className="p-5">
          <h3 className="font-semibold mb-2">Catatan Inspector</h3>
          <p className="text-sm text-muted-foreground">{session.notes}</p>
        </Card>
      )}

      {/* OCR Details */}
      {photos.some(p => p.damage_labels?.length > 0) && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Detail Kerusakan</h3>
          <div className="space-y-2">
            {photos.filter(p => p.damage_labels?.length > 0).map(photo => (
              <div key={photo.id}>
                {photo.damage_labels.map((d, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      <span className="text-sm capitalize">{d.type}</span>
                      <span className="text-xs text-muted-foreground capitalize">({photo.photo_angle})</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {((d.confidence || 0) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
