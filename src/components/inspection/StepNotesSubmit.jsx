import React from 'react';
import { CheckCircle2, FileText, ImageIcon, ScanLine } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export default function StepNotesSubmit({ data, photos, ocrResults, notes, onNotesChange }) {
  const entries = Object.entries(photos || {});

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Pemeriksaan akhir</p>
        <h2 className="text-xl font-bold tracking-tight">Tinjau laporan inspeksi</h2>
        <p className="text-sm text-muted-foreground">Pastikan data, hasil pembacaan serial, dan foto sudah sesuai sebelum dikirim.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border/80 px-5 py-4">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Ringkasan kontainer</h3>
        </div>
        <dl className="grid gap-px bg-border/70 text-sm sm:grid-cols-2">
          <div className="bg-card px-5 py-4"><dt className="text-xs text-muted-foreground">ID Kontainer</dt><dd className="mt-1 font-mono font-semibold">{data.container_id || '-'}</dd></div>
          <div className="bg-card px-5 py-4"><dt className="text-xs text-muted-foreground">Nama Shipper</dt><dd className="mt-1 font-medium">{data.shipper_name || '-'}</dd></div>
          <div className="bg-card px-5 py-4"><dt className="text-xs text-muted-foreground">Tipe Inspeksi</dt><dd className="mt-1 capitalize font-medium">{data.inspection_type || '-'}</dd></div>
          <div className="bg-card px-5 py-4"><dt className="text-xs text-muted-foreground">Lokasi</dt><dd className="mt-1 font-medium">{data.location_name || '-'}</dd></div>
        </dl>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Foto inspeksi</h3>
          </div>
          <span className="data-value text-xs font-medium text-muted-foreground">{entries.length} foto</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {entries.map(([angle, photo]) => {
            const result = ocrResults?.[angle];
            const serial = result?.confirmed_serial || result?.detected_serial || photo?.detected_serial;
            return (
              <div key={angle} className="overflow-hidden rounded-lg border border-border/80 bg-muted/30">
                {photo?.url ? <img src={photo.url} alt={`Foto ${angle} kontainer ${data.container_id || ''}`} className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center text-muted-foreground"><ImageIcon className="h-5 w-5" /></div>}
                <div className="space-y-1 px-3 py-2">
                  <p className="text-xs font-semibold capitalize">{angle}</p>
                  {serial && <p className="flex items-center gap-1 truncate font-mono text-[11px] text-muted-foreground"><ScanLine className="h-3 w-3 shrink-0" />{serial}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <label htmlFor="inspection-notes" className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-primary" />Catatan tambahan</label>
        <p className="mt-1 text-sm text-muted-foreground">Tambahkan informasi yang perlu diperhatikan oleh admin.</p>
        <Textarea id="inspection-notes" value={notes || ''} onChange={(event) => onNotesChange(event.target.value)} placeholder="Tulis catatan inspeksi bila diperlukan" className="mt-4 min-h-28 resize-y" />
      </Card>
    </div>
  );
}
