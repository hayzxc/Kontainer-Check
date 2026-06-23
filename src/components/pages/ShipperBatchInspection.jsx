import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAndSubmitInspection } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Send, Loader2, MapPin, User, Clipboard, ArrowLeft, Package2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import ContainerPhotoCard from '@/components/shipper/ContainerPhotoCard';
import { containerIdError } from '@/lib/containerUtils';

const emptyContainer = () => ({
  container_id: '',
  photos: {},
});

export default function ShipperBatchInspection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [batchInfo, setBatchInfo] = useState({
    shipper_name: user?.full_name || '',
    inspection_type: '',
    location_name: '',
    latitude: null,
    longitude: null,
  });

  const [containers, setContainers] = useState([emptyContainer()]);

  const handleGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setBatchInfo(prev => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
      }, () => {});
    }
  };

  const addContainer = () => setContainers(prev => [...prev, emptyContainer()]);

  const updateContainer = (index, updated) => {
    if (typeof updated === 'function') {
      setContainers(prev => prev.map((c, i) => i === index ? updated(c) : c));
    } else {
      setContainers(prev => prev.map((c, i) => i === index ? updated : c));
    }
  };

  const removeContainer = (index) => {
    setContainers(prev => prev.filter((_, i) => i !== index));
  };

  const isContainerValid = (c) => {
    return c.container_id && !containerIdError(c.container_id) &&
      ['serial', 'front', 'back'].every(a => c.photos[a]);
  };

  const batchInfoValid = batchInfo.shipper_name && batchInfo.inspection_type && batchInfo.location_name;
  const allContainersValid = containers.length > 0 && containers.every(isContainerValid);
  const canSubmit = batchInfoValid && allContainersValid;

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      for (const container of containers) {
        await createAndSubmitInspection({
          ...batchInfo,
          container_id: container.container_id,
        }, Object.entries(container.photos).map(([angle, photo]) => ({
          photo_url: photo.url,
          photo_angle: angle,
          file_size_kb: photo.file_size_kb || 0,
          ocr_detected_serial: photo.detected_serial || '',
          ocr_confidence: photo.ocr_confidence || 0,
          ocr_processed: Boolean(photo.detected_serial),
        })));
      }
      navigate('/shipper');
    } catch (error) {
      setSubmitError(error.message || 'Batch gagal dikirim. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/shipper')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Kirim Batch Kontainer</h1>
          <p className="text-sm text-muted-foreground">Kirim foto beberapa kontainer sekaligus dalam satu pengiriman</p>
        </div>
      </div>

      {/* Batch Info */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-sm">Informasi Pengiriman</h2>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2 text-xs">
            <User className="w-3.5 h-3.5 text-primary" /> Nama Shipper
          </Label>
          <Input
            placeholder="Nama perusahaan / shipper"
            value={batchInfo.shipper_name}
            onChange={(e) => setBatchInfo(prev => ({ ...prev, shipper_name: e.target.value }))}
            className="h-10"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2 text-xs">
            <Clipboard className="w-3.5 h-3.5 text-primary" /> Tipe Inspeksi
          </Label>
          <Select
            value={batchInfo.inspection_type}
            onValueChange={(val) => setBatchInfo(prev => ({ ...prev, inspection_type: val }))}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Pilih tipe inspeksi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arrival">Kedatangan (Arrival)</SelectItem>
              <SelectItem value="departure">Keberangkatan (Departure)</SelectItem>
              <SelectItem value="periodic">Periodik (Periodic)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-primary" /> Lokasi
          </Label>
          <Input
            placeholder="Nama lokasi / depo"
            value={batchInfo.location_name}
            onChange={(e) => setBatchInfo(prev => ({ ...prev, location_name: e.target.value }))}
            className="h-10"
          />
          <Button type="button" variant="outline" size="sm" className="gap-2 h-8 text-xs" onClick={handleGPS}>
            <MapPin className="w-3 h-3" /> Deteksi GPS Otomatis
          </Button>
          {batchInfo.latitude && (
            <p className="text-xs text-muted-foreground">
              GPS: {batchInfo.latitude.toFixed(6)}, {batchInfo.longitude.toFixed(6)}
            </p>
          )}
        </div>
      </Card>

      {/* Containers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Package2 className="w-4 h-4 text-primary" />
            Daftar Kontainer ({containers.length})
          </h2>
          <Button variant="outline" size="sm" className="gap-2 h-8 text-xs" onClick={addContainer}>
            <Plus className="w-3.5 h-3.5" /> Tambah Kontainer
          </Button>
        </div>

        {containers.map((container, index) => (
          <ContainerPhotoCard
            key={index}
            index={index}
            container={container}
            onChange={(updated) => updateContainer(index, updated)}
            onRemove={() => removeContainer(index)}
            canRemove={containers.length > 1}
          />
        ))}

        <Button variant="dashed" className="w-full gap-2 border-2 border-dashed border-primary/30 bg-transparent text-muted-foreground hover:border-primary/60 hover:text-foreground hover:bg-primary/5 h-12" onClick={addContainer}>
          <Plus className="w-4 h-4" /> Tambah Kontainer Lagi
        </Button>
      </div>

      {/* Submit */}
      <div className="pt-2 pb-8">
        {submitError && <p className="mb-3 text-center text-sm text-destructive" role="alert">{submitError}</p>}
        {!canSubmit && (
          <p className="text-xs text-muted-foreground text-center mb-3">
            {!batchInfoValid ? 'Lengkapi informasi pengiriman terlebih dahulu.' :
             !allContainersValid ? 'Pastikan semua kontainer memiliki ID dan 3 foto wajib.' : ''}
          </p>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 h-12" disabled={!canSubmit || submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Mengirim...' : `Kirim ${containers.length} Kontainer`}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kirim {containers.length} Kontainer?</AlertDialogTitle>
              <AlertDialogDescription>
                Anda akan mengirim foto verifikasi untuk <strong>{containers.length} kontainer</strong> dari lokasi <strong>{batchInfo.location_name}</strong> ke admin untuk diperiksa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700">
                Ya, Kirim Semua
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
