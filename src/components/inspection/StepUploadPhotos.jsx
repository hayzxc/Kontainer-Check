import React, { useRef } from 'react';
import { integrations } from '@/lib/api';
import { Camera, X, CheckCircle2, ScanLine, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const REQUIRED_ANGLES = [
  { key: 'serial', label: 'Foto No Container' },
  { key: 'front', label: 'Foto Komoditi' },
  { key: 'back', label: 'Foto ISPM' },
];

const OPTIONAL_ANGLES = [
  { key: 'interior', label: 'Foto Tambahan' },
];

export default function StepUploadPhotos({ photos, onPhotosChange, uploading, setUploading, onSerialDetected }) {
  const fileRefs = useRef({});

  const scanPhotoForSerial = async (url, angle) => {
    // Mark as scanning
    onPhotosChange(prev => ({ ...prev, [angle]: { ...prev[angle], scanning: true } }));

    const res = await integrations.Core.InvokeLLM({
      prompt: `Look at this shipping container photo. Extract the container ID/serial number if visible.
The format is 4 letters (owner code + equipment category) followed by 6 digits and 1 check digit (e.g. MSCU1234567, TGHU8765432).
If no container serial number is visible, return an empty string.`,
      file_urls: [url],
      response_json_schema: {
        type: 'object',
        properties: {
          detected_serial: { type: 'string', description: 'Detected container serial or empty string' },
          confidence: { type: 'number', description: 'Confidence 0.0-1.0' },
        },
      },
    });

    const serial = (res.detected_serial || '').trim().toUpperCase();
    const confidence = res.confidence || 0;

    onPhotosChange(prev => ({
      ...prev,
      [angle]: { ...prev[angle], scanning: false, detected_serial: serial, ocr_confidence: confidence },
    }));

    if (serial && confidence > 0.5 && typeof onSerialDetected === 'function') {
      onSerialDetected(serial, confidence);
    }
  };

  const handleUpload = async (angle, file) => {
    setUploading(angle);
    const { file_url } = await integrations.Core.UploadFile({ file });
    const photoData = { url: file_url, file_size_kb: Math.round(file.size / 1024), scanning: false };
    onPhotosChange(prev => ({ ...prev, [angle]: photoData }));
    setUploading(null);

    // Auto-scan for serial in background
    scanPhotoForSerial(file_url, angle);
  };

  const handleRemove = (angle) => {
    onPhotosChange(prev => {
      const next = { ...prev };
      delete next[angle];
      return next;
    });
  };

  const renderSlot = (angle, label, required) => {
    const photo = photos[angle];
    const isUploading = uploading === angle;

    return (
      <div key={angle} className="relative">
        <input
          ref={(el) => fileRefs.current[angle] = el}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { if (e.target.files[0]) handleUpload(angle, e.target.files[0]); }}
        />

        {photo ? (
          <div className="relative group rounded-xl overflow-hidden border-2 border-emerald-300 aspect-[4/3]">
            <img src={photo.url} alt={label} className="w-full h-full object-cover" />

            {/* Scanning overlay */}
            {photo.scanning && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
                <span className="text-white text-xs font-medium">Memindai serial...</span>
              </div>
            )}

            {/* Serial badge */}
            {!photo.scanning && photo.detected_serial && (
              <div className="absolute top-2 left-2">
                <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-mono px-1.5 py-0.5">
                  <ScanLine className="w-3 h-3" />
                  {photo.detected_serial}
                </Badge>
              </div>
            )}

            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button size="sm" variant="destructive" onClick={() => handleRemove(angle)} className="gap-1">
                <X className="w-3.5 h-3.5" /> Hapus
              </Button>
            </div>
            {!photo.scanning && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 drop-shadow" />
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <span className="text-white text-xs font-medium">{label}</span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRefs.current[angle]?.click()}
            disabled={isUploading}
            className={cn(
              "w-full aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all",
              required ? "border-primary/30 hover:border-primary/60 hover:bg-primary/5" : "border-border hover:border-muted-foreground/40 hover:bg-muted/50",
              isUploading && "animate-pulse bg-muted"
            )}
          >
            {isUploading
              ? <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              : <Camera className="w-6 h-6 text-muted-foreground" />
            }
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            {required && <span className="text-[10px] text-destructive font-medium">Wajib</span>}
          </button>
        )}
      </div>
    );
  };

  // Show detected serials summary
  const detectedSerials = Object.entries(photos)
    .filter(([, p]) => p.detected_serial)
    .map(([angle, p]) => ({ angle, serial: p.detected_serial, confidence: p.ocr_confidence }))
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold">Upload Foto</h2>
        <p className="text-sm text-muted-foreground">
          Upload 3 foto wajib: No Container, Komoditi, dan ISPM. AI akan otomatis memindai nomor seri.
        </p>
      </div>

      {detectedSerials.length > 0 && (
        <Card className="p-4 border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-2 mb-2">
            <ScanLine className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-800">Serial Terdeteksi AI</p>
          </div>
          <div className="space-y-1">
            {detectedSerials.map(({ angle, serial, confidence }) => (
              <div key={angle} className="flex items-center justify-between text-sm">
                <span className="font-mono font-bold text-emerald-900">{serial}</span>
              <span className="text-xs text-emerald-600 capitalize">{angle} - {((confidence || 0) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <p className="text-sm font-medium mb-3">
          Foto Wajib ({Object.keys(photos).filter(k => REQUIRED_ANGLES.some(a => a.key === k)).length}/3)
        </p>
        <div className="grid grid-cols-2 gap-3">
          {REQUIRED_ANGLES.map(a => renderSlot(a.key, a.label, true))}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-medium mb-3">Foto Opsional</p>
        <div className="grid grid-cols-2 gap-3">
          {OPTIONAL_ANGLES.map(a => renderSlot(a.key, a.label, false))}
        </div>
      </Card>
    </div>
  );
}
