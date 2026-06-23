import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAndSubmitInspection } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

import StepContainerData from '@/components/inspection/StepContainerData';
import StepUploadPhotos from '@/components/inspection/StepUploadPhotos';

const STEPS = ['Data Kontainer', 'Upload Foto'];

export default function ShipperNewInspection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [uploading, setUploading] = useState(null);

  const [formData, setFormData] = useState({
    container_id: '',
    shipper_name: user?.full_name || '',
    inspection_type: '',
    location_name: '',
    latitude: null,
    longitude: null,
  });
  const [photos, setPhotos] = useState({});

  const canNext = () => {
    if (step === 0) return formData.container_id && formData.inspection_type && formData.location_name;
    if (step === 1) return ['serial', 'front', 'back'].every(a => photos[a]);
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      await createAndSubmitInspection(formData, Object.entries(photos).map(([angle, photo]) => ({
        photo_url: photo.url,
        photo_angle: angle,
        file_size_kb: photo.file_size_kb || 0,
        ocr_detected_serial: photo.detected_serial || '',
        ocr_confidence: photo.ocr_confidence || 0,
        ocr_processed: Boolean(photo.detected_serial),
      })));
      navigate('/shipper');
    } catch (error) {
      setSubmitError(error.message || 'Foto gagal dikirim. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4 mb-3">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                i < step ? 'bg-emerald-500 text-white' :
                i === step ? 'bg-primary text-primary-foreground shadow-lg' :
                'bg-muted text-muted-foreground'
              )}>
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('w-20 h-0.5 mx-2', i < step ? 'bg-emerald-500' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Langkah {step + 1} dari {STEPS.length}: <span className="font-medium text-foreground">{STEPS[step]}</span>
        </p>
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {step === 0 && <StepContainerData data={formData} onChange={setFormData} />}
        {step === 1 && (
          <StepUploadPhotos
            photos={photos}
            onPhotosChange={setPhotos}
            uploading={uploading}
            setUploading={setUploading}
            onSerialDetected={(serial) => setFormData(prev => ({ ...prev, container_id: prev.container_id || serial }))}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => step === 0 ? navigate('/shipper') : setStep(step - 1)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="gap-2">
            Lanjut <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!canNext() || submitting} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Kirim Verifikasi
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Kirim Foto Verifikasi?</AlertDialogTitle>
                <AlertDialogDescription>
                  Foto untuk kontainer <strong>{formData.container_id}</strong> akan dikirim ke admin untuk diperiksa.
                  Pastikan semua foto sudah jelas dan sesuai.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700">
                  Ya, Kirim
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      {submitError && <p className="mt-3 text-sm text-destructive" role="alert">{submitError}</p>}
    </div>
  );
}
