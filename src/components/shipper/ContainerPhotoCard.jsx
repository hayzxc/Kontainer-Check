import React, { useRef, useState } from 'react';
import { integrations } from '@/lib/api';
import { Camera, X, CheckCircle2, ScanLine, Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { normalizeContainerId, containerIdError } from '@/lib/containerUtils';

const REQUIRED_ANGLES = [
  { key: 'serial', label: 'Foto No Container' },
  { key: 'front', label: 'Foto Komoditi' },
  { key: 'back', label: 'Foto ISPM' },
];

export default function ContainerPhotoCard({ container, index, onChange, onRemove, canRemove }) {
  const [expanded, setExpanded] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [idTouched, setIdTouched] = useState(false);
  const fileRefs = useRef({});

  const idError = idTouched ? containerIdError(container.container_id) : null;
  const photosOk = REQUIRED_ANGLES.every(a => container.photos[a.key]);
  const containerIdOk = !!container.container_id && !containerIdError(container.container_id);
  const isComplete = photosOk && containerIdOk;

  const handleIdChange = (e) => {
    const normalized = normalizeContainerId(e.target.value);
    onChange({ ...container, container_id: normalized });
  };

  const scanPhotoForSerial = async (url, angle) => {
    onChange(prev => ({
      ...prev,
      photos: { ...prev.photos, [angle]: { ...prev.photos[angle], scanning: true } },
    }));

    const res = await integrations.Core.InvokeLLM({
      prompt: `Look at this shipping container photo. Extract the container ID/serial number if visible.
The format is 4 letters followed by 6 digits and 1 check digit (e.g. MSCU1234567).
If no container serial number is visible, return an empty string.`,
      file_urls: [url],
      response_json_schema: {
        type: 'object',
        properties: {
          detected_serial: { type: 'string' },
          confidence: { type: 'number' },
        },
      },
    });

    const serial = (res.detected_serial || '').trim().toUpperCase();
    const confidence = res.confidence || 0;

    onChange(prev => ({
      ...prev,
      container_id: prev.container_id || serial,
      photos: {
        ...prev.photos,
        [angle]: { ...prev.photos[angle], scanning: false, detected_serial: serial, ocr_confidence: confidence },
      },
    }));
  };

  const handleUpload = async (angle, file) => {
    setUploading(angle);
    const { file_url } = await integrations.Core.UploadFile({ file });
    const photoData = { url: file_url, file_size_kb: Math.round(file.size / 1024), scanning: false };
    onChange({ ...container, photos: { ...container.photos, [angle]: photoData } });
    setUploading(null);
    scanPhotoForSerial(file_url, angle);
  };

  const handleRemovePhoto = (angle) => {
    const next = { ...container.photos };
    delete next[angle];
    onChange({ ...container, photos: next });
  };

  const renderSlot = (angle, label) => {
    const photo = container.photos[angle];
    const isUp = uploading === angle;

    return (
      <div key={angle} className="relative">
        <input
          ref={(el) => fileRefs.current[angle] = el}
          type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { if (e.target.files[0]) handleUpload(angle, e.target.files[0]); }}
        />
        {photo ? (
          <div className="relative group rounded-lg overflow-hidden border-2 border-emerald-300 aspect-[4/3]">
            <img src={photo.url} alt={label} className="w-full h-full object-cover" />
            {photo.scanning && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
                <span className="text-white text-[10px]">Memindai...</span>
              </div>
            )}
            {!photo.scanning && photo.detected_serial && (
              <div className="absolute top-1 left-1">
                <Badge className="bg-emerald-600 text-white text-[9px] gap-1 font-mono px-1 py-0.5">
                  <ScanLine className="w-2.5 h-2.5" />{photo.detected_serial}
                </Badge>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button size="sm" variant="destructive" onClick={() => handleRemovePhoto(angle)} className="gap-1 text-xs h-7">
                <X className="w-3 h-3" /> Hapus
              </Button>
            </div>
            {!photo.scanning && (
              <div className="absolute top-1 right-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow" />
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
              <span className="text-white text-[10px] font-medium">{label}</span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRefs.current[angle]?.click()}
            disabled={isUp}
            className={cn(
              "w-full aspect-[4/3] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-all",
              "border-primary/30 hover:border-primary/60 hover:bg-primary/5",
              isUp && "animate-pulse bg-muted"
            )}
          >
            {isUp ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Camera className="w-5 h-5 text-muted-foreground" />}
            <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
            <span className="text-[9px] text-destructive font-medium">Wajib</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <Card className={cn("border-2 transition-colors", isComplete ? "border-emerald-300" : "border-border")}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold",
            isComplete ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
          )}>
            {isComplete ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
          </div>
          <div>
            <p className="font-semibold text-sm">
              {container.container_id || <span className="text-muted-foreground italic">Kontainer {index + 1}</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {Object.keys(container.photos).filter(k => REQUIRED_ANGLES.some(a => a.key === k)).length}/3 foto wajib
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canRemove && (
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t pt-4">
          <div className="space-y-1.5">
            <Label className="text-xs">ID Kontainer</Label>
            <Input
              placeholder="e.g. MSCU1234567"
              value={container.container_id || ''}
              onChange={handleIdChange}
              onBlur={() => setIdTouched(true)}
              className={cn("font-mono h-10", idError && "border-destructive")}
            />
            {idError && <p className="text-xs text-destructive">{idError}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {REQUIRED_ANGLES.map(a => renderSlot(a.key, a.label))}
          </div>
        </div>
      )}
    </Card>
  );
}
