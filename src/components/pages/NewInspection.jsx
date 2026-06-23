import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAndSubmitInspection } from '@/lib/api';
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
import StepOCRReview from '@/components/inspection/StepOCRReview';
import StepNotesSubmit from '@/components/inspection/StepNotesSubmit';

const STEPS = ['Data Kontainer', 'Upload Foto', 'Review OCR', 'Submit'];

export default function NewInspection() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [uploading, setUploading] = useState(null);

  const [formData, setFormData] = useState({
    container_id: '',
    inspection_type: '',
    location_name: '',
    latitude: null,
    longitude: null,
  });
  const [photos, setPhotos] = useState({});
  const [ocrResults, setOcrResults] = useState({});
  const [notes, setNotes] = useState('');
  const [autoDetectedSerial, setAutoDetectedSerial] = useState(null);

  // Called by StepUploadPhotos when AI detects a serial - auto-fill container_id if blank
  const handleSerialDetected = (serial, confidence) => {
    setAutoDetectedSerial({ serial, confidence });
    setFormData(prev => ({
      ...prev,
      container_id: prev.container_id || serial,
    }));
  };

  const canNext = () => {
    if (step === 0) return formData.container_id && formData.inspection_type && formData.location_name;
    if (step === 1) return ['serial', 'front', 'back'].every(a => photos[a]);
    if (step === 2) return Object.keys(ocrResults).length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const bestSerial = Object.values(ocrResults)
        .filter(r => r.confirmed_serial)
        .sort((a, b) => b.confidence - a.confidence)[0];
      const session = await createAndSubmitInspection({
        ...formData,
        notes,
        ocr_serial: bestSerial?.confirmed_serial || '',
      }, Object.entries(photos).map(([angle, photo]) => {
        const ocr = ocrResults[angle];
        return {
          photo_url: photo.url,
          photo_angle: angle,
          file_size_kb: photo.file_size_kb || 0,
          ocr_detected_serial: ocr?.detected_serial || '',
          ocr_confirmed_serial: ocr?.confirmed_serial || '',
          ocr_confidence: ocr?.confidence || 0,
          damage_labels: ocr?.damages || [],
          ocr_processed: Boolean(ocr),
          is_corrected: ocr?.edited || false,
        };
      }));
      navigate(`/inspections/${session.id}`);
    } catch (error) {
      setSubmitError(error.message || 'Laporan gagal dikirim. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step Progress */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                i < step ? 'bg-emerald-500 text-white' :
                i === step ? 'bg-primary text-primary-foreground shadow-lg' :
                'bg-muted text-muted-foreground'
              )}>
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  'hidden sm:block w-12 lg:w-20 h-0.5',
                  i < step ? 'bg-emerald-500' : 'bg-border'
                )} />
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
        {step === 1 && <StepUploadPhotos photos={photos} onPhotosChange={setPhotos} uploading={uploading} setUploading={setUploading} onSerialDetected={handleSerialDetected} />}
        {step === 2 && <StepOCRReview photos={photos} ocrResults={ocrResults} setOcrResults={setOcrResults} />}
        {step === 3 && <StepNotesSubmit data={formData} photos={photos} ocrResults={ocrResults} notes={notes} onNotesChange={setNotes} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => step === 0 ? navigate(-1) : setStep(step - 1)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>

        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="gap-2"
          >
            Lanjut <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={submitting} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Laporan
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Kirim Laporan Inspeksi?</AlertDialogTitle>
                <AlertDialogDescription>
                  Laporan inspeksi untuk kontainer <strong>{formData.container_id}</strong> akan dikirim untuk verifikasi admin. 
                  Pastikan semua data dan foto sudah benar.
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
