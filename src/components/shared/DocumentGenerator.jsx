import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function PhotoCell({ photo, session, alt }) {
  const coordLine = session.latitude && session.longitude
    ? `${session.latitude.toFixed(6)}, ${session.longitude.toFixed(6)}`
    : '';
  const timestamp = session.updated_date || session.created_date
    ? format(new Date(session.updated_date || session.created_date), 'dd/MM/yyyy HH:mm')
    : '';

  const overlayText = [coordLine, timestamp].filter(Boolean).join(' | ');

  if (!photo) {
    return (
      <div style={{ width: '220px', height: '150px', background: '#f3f4f6', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '11px' }}>
        Tidak ada foto
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '220px', height: '150px', display: 'inline-block' }}>
      <img
        src={photo.photo_url}
        alt={alt}
        style={{ width: '220px', height: '150px', objectFit: 'cover', borderRadius: '4px', display: 'block' }}
        crossOrigin="anonymous"
      />
      {overlayText && (
        <div style={{
          position: 'absolute',
          bottom: '4px',
          right: '4px',
          background: 'rgba(0,0,0,0.55)',
          color: '#fff',
          fontSize: '8px',
          padding: '2px 5px',
          borderRadius: '3px',
          lineHeight: '1.4',
          maxWidth: '200px',
          textAlign: 'right',
        }}>
          {coordLine && <div>{coordLine}</div>}
          {timestamp && <div>{timestamp}</div>}
        </div>
      )}
    </div>
  );
}

// Map photo_angle keys to document columns
const PHOTO_MAP = {
  container: 'serial',
  komoditi: 'front',
  ispm: 'back',
};

function DocumentPreview({ sessions = [], photosMap = {} }) {
  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        background: '#fff',
        width: '1100px',
        padding: '0',
      }}
    >
      {/* Header */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#2E86C1', color: '#fff' }}>
            <th style={{ padding: '14px 12px', textAlign: 'left', width: '150px', fontWeight: 600 }}>Nama Shipper</th>
            <th style={{ padding: '14px 12px', textAlign: 'left', width: '240px', fontWeight: 600 }}>Foto No Container</th>
            <th style={{ padding: '14px 12px', textAlign: 'left', width: '240px', fontWeight: 600 }}>Foto Komoditi</th>
            <th style={{ padding: '14px 12px', textAlign: 'left', width: '240px', fontWeight: 600 }}>Foto ISPM</th>
            <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 600 }}>Lokasi Map</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, idx) => {
            const sessionPhotos = photosMap[session.id] || [];
            const photoByAngle = {};
            sessionPhotos.forEach(p => { photoByAngle[p.photo_angle] = p; });

            const containerPhoto = photoByAngle[PHOTO_MAP.container];
            const komoditiPhoto = photoByAngle[PHOTO_MAP.komoditi];
            const ispmPhoto = photoByAngle[PHOTO_MAP.ispm];

            const rowBg = idx % 2 === 0 ? '#f9f9f9' : '#fff';

            return (
              <tr key={session.id} style={{ background: rowBg, verticalAlign: 'top' }}>
                <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontWeight: 500 }}>
                  {session.inspector_name || session.container_id}
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                  <PhotoCell photo={containerPhoto} session={session} alt="container" />
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                  <PhotoCell photo={komoditiPhoto} session={session} alt="komoditi" />
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                  <PhotoCell photo={ispmPhoto} session={session} alt="ispm" />
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '11px', color: '#374151' }}>
                  {session.location_name && <div style={{ marginBottom: '4px' }}>{session.location_name}</div>}
                  {session.latitude && session.longitude ? (
                    <div style={{ color: '#6b7280' }}>
                      {session.latitude.toFixed(5)}, {session.longitude.toFixed(5)}
                    </div>
                  ) : (
        <div style={{ color: '#9ca3af' }}>-</div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function DocumentGenerator({ sessions = [], photosMap = {}, filename = 'containers' }) {
  const previewRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!previewRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 1.5, canvas.height / 1.5] });
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 1.5, canvas.height / 1.5);
      pdf.save(`${filename}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button onClick={handleExport} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        {loading ? 'Membuat PDF...' : 'Export PDF'}
      </Button>

      {/* Hidden render target */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={previewRef}>
          <DocumentPreview sessions={sessions} photosMap={photosMap} />
        </div>
      </div>
    </div>
  );
}
