import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/components/AuthLayout';
import { resendOtp, verifyOtp } from '@/lib/api';

export default function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // support otpCode as either a string or an array (some OTP libraries emit arrays)
  const isOtpComplete = React.useMemo(() => {
    if (typeof otpCode === 'string') return otpCode.length >= 6;
    if (Array.isArray(otpCode)) return otpCode.filter(Boolean).join('').length >= 6;
    return false;
  }, [otpCode]);

  const handleVerify = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOtp({ email, otpCode });
      setMessage('Email berhasil diverifikasi. Anda akan diarahkan ke halaman masuk.');
      window.setTimeout(() => navigate('/login', { replace: true }), 1_500);
    } catch (err) {
      setError(err.message || 'Kode verifikasi tidak valid atau telah kedaluwarsa.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    setResending(true);
    try {
      await resendOtp(email);
      setMessage('Kode verifikasi baru telah dikirim. Periksa email Anda.');
    } catch (err) {
      setError(err.message || 'Kode verifikasi tidak dapat dikirim ulang.');
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <AuthLayout icon={Mail} title="Email diperlukan" subtitle="Daftar terlebih dahulu untuk menerima kode verifikasi.">
        <Link to="/register"><Button className="h-12 w-full">Buat akun</Button></Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Mail}
      title="Verifikasi email"
      subtitle={<>Kami mengirim kode 6 digit ke <strong>{email}</strong>.</>}
      footer={<Link to="/login" className="font-medium text-primary hover:underline">Kembali ke masuk</Link>}
    >
      {error && <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {message && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
      <form onSubmit={handleVerify} className="space-y-5">
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
              <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button type="submit" className="h-12 w-full" disabled={loading || !isOtpComplete || Boolean(message)}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memverifikasi...</> : 'Verifikasi email'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Belum menerima kode?{' '}
        <button type="button" onClick={handleResend} disabled={resending || Boolean(message)} className="font-medium text-primary hover:underline disabled:opacity-50">
          {resending ? 'Mengirim ulang...' : 'Kirim ulang'}
        </button>
      </p>
    </AuthLayout>
  );
}
