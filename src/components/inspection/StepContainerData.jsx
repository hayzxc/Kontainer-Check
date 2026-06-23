import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Container, Clipboard, AlertCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { normalizeContainerId, containerIdError } from '@/lib/containerUtils';

export default function StepContainerData({ data, onChange }) {
  const [idTouched, setIdTouched] = useState(false);
  const idError = idTouched ? containerIdError(data.container_id) : null;

  const handleIdChange = (e) => {
    const normalized = normalizeContainerId(e.target.value);
    onChange({ ...data, container_id: normalized });
  };

  const handleGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onChange({
            ...data,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {}
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold">Data Kontainer</h2>
        <p className="text-sm text-muted-foreground">Masukkan informasi dasar kontainer yang akan diinspeksi.</p>
      </div>

      <Card className="p-5 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="container_id" className="flex items-center gap-2">
            <Container className="w-4 h-4 text-primary" /> ID Kontainer
          </Label>
          <Input
            id="container_id"
            placeholder="e.g. MSCU1234567"
            value={data.container_id || ''}
            onChange={handleIdChange}
            onBlur={() => setIdTouched(true)}
            className={`font-mono text-lg h-12 ${idError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          />
          {idError ? (
            <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{idError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Masukkan nomor kontainer sesuai yang tertera di fisik kontainer</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Nama Shipper
          </Label>
          <Input
            placeholder="Nama perusahaan / shipper"
            value={data.shipper_name || ''}
            onChange={(e) => onChange({ ...data, shipper_name: e.target.value })}
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clipboard className="w-4 h-4 text-primary" /> Tipe Inspeksi
          </Label>
          <Select
            value={data.inspection_type || ''}
            onValueChange={(val) => onChange({ ...data, inspection_type: val })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Pilih tipe inspeksi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arrival">Kedatangan (Arrival)</SelectItem>
              <SelectItem value="departure">Keberangkatan (Departure)</SelectItem>
              <SelectItem value="periodic">Periodik (Periodic)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Lokasi
          </Label>
          <Input
            placeholder="Nama lokasi / depo"
            value={data.location_name || ''}
            onChange={(e) => onChange({ ...data, location_name: e.target.value })}
            className="h-12"
          />
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleGPS}>
            <MapPin className="w-3.5 h-3.5" />
            Deteksi GPS Otomatis
          </Button>
          {data.latitude && (
            <p className="text-xs text-muted-foreground">
              GPS: {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}