import React, { useState, useEffect } from 'react';
import { integrations } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScanLine, CheckCircle2, Edit3, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function StepOCRReview({ photos, ocrResults, setOcrResults }) {
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!processed && Object.keys(photos).length > 0 && Object.keys(ocrResults).length === 0) {
      runOCR();
    }
  }, []);

  const runOCR = async () => {
    setProcessing(true);
    try {
      const results = {};

      // Process each photo through LLM for OCR
      for (const [angle, photo] of Object.entries(photos)) {
        const res = await integrations.Core.InvokeLLM({
          prompt: `Analyze this container photo. Extract:
1. Any container serial number visible (ISO 6346 format: 4 letters + 6 digits + 1 check digit, e.g., MSCU1234567)
2. Any visible damage (rust, dent, crack, hole, scratch)
Return your analysis.`,
          file_urls: [photo.url],
          response_json_schema: {
            type: "object",
            properties: {
              detected_serial: { type: "string", description: "Detected serial number or empty string" },
              confidence: { type: "number", description: "Confidence score 0.0-1.0" },
              damages: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    confidence: { type: "number" }
                  }
                }
              }
            }
          }
        });

        results[angle] = {
          detected_serial: res.detected_serial || '',
          confirmed_serial: res.detected_serial || '',
          confidence: res.confidence || 0,
          damages: res.damages || [],
          edited: false,
        };
      }

      setOcrResults(results);
      setProcessed(true);
    } catch (err) {
      console.error("OCR Error:", err);
      toast({
        title: "Proses OCR Gagal",
        description: "Terjadi kesalahan saat memproses gambar dengan AI.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSerialEdit = (angle, value) => {
    setOcrResults({
      ...ocrResults,
      [angle]: { ...ocrResults[angle], confirmed_serial: value, edited: true }
    });
  };

  // Find the best serial across all photos
  const bestSerial = Object.values(ocrResults)
    .filter(r => r.detected_serial)
    .sort((a, b) => b.confidence - a.confidence)[0];

  const allDamages = Object.entries(ocrResults).flatMap(([angle, r]) =>
    (r.damages || []).map(d => ({ ...d, angle }))
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold">Review Hasil OCR</h2>
        <p className="text-sm text-muted-foreground">
          Verifikasi nomor seri yang terdeteksi dan hasil deteksi kerusakan.
        </p>
      </div>

      {processing ? (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="font-medium">Memproses foto...</p>
              <p className="text-sm text-muted-foreground">OCR & deteksi kerusakan sedang berjalan</p>
            </div>
          </div>
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        </Card>
      ) : (
        <>
          {/* Main Serial Detection */}
          {bestSerial && (
            <Card className="p-5 border-2 border-primary/20 bg-primary/5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ScanLine className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Nomor Seri Terdeteksi</p>
                  <p className="text-2xl font-mono font-bold">{bestSerial.detected_serial}</p>
                  <Badge variant="outline" className="mt-2 gap-1">
                    Confidence: {(bestSerial.confidence * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            </Card>
          )}

          {/* Per-photo results */}
          <div className="space-y-3">
            {Object.entries(ocrResults).map(([angle, result]) => (
              <Card key={angle} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <img 
                    src={photos[angle]?.url} 
                    alt={angle} 
                    className="w-16 h-12 rounded-lg object-cover border"
                  />
                  <div>
                    <p className="font-medium capitalize text-sm">{angle}</p>
                    {result.detected_serial ? (
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Serial terdeteksi
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Tidak ada serial terdeteksi</p>
                    )}
                  </div>
                </div>

                {result.detected_serial && (
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Edit3 className="w-3 h-3" /> Konfirmasi/Koreksi Serial
                    </Label>
                    <Input
                      value={result.confirmed_serial}
                      onChange={(e) => handleSerialEdit(angle, e.target.value.toUpperCase())}
                      className="font-mono h-10"
                    />
                  </div>
                )}

                {result.damages?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {result.damages.map((d, i) => (
                      <Badge key={i} variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {d.type} ({(d.confidence * 100).toFixed(0)}%)
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Damage Summary */}
          {allDamages.length > 0 && (
            <Card className="p-5 border-destructive/20 bg-destructive/5">
              <p className="font-medium text-sm mb-2 text-destructive">
                Kerusakan Terdeteksi ({allDamages.length})
              </p>
              <div className="space-y-1">
                {allDamages.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{d.type} - <span className="text-muted-foreground capitalize">{d.angle}</span></span>
                    <Badge variant="outline" className="text-xs">{(d.confidence * 100).toFixed(0)}%</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Button variant="outline" onClick={runOCR} className="gap-2">
            <ScanLine className="w-4 h-4" /> Proses Ulang OCR
          </Button>
        </>
      )}
    </div>
  );
}
