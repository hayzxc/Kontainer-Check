import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

const require = createRequire(import.meta.url);
const AuthVerify = require('auth-verify');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

const verifier = new AuthVerify({
  otpExpiry: '10m',
  storeTokens: 'memory',
});

verifier.otp.maxAttempt(5);
verifier.otp.cooldown('60s');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

function assertEmailConfiguration() {
  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error('Email verification is not configured. Set EMAIL_USER and EMAIL_PASS on the backend.');
  }
}

async function deliverOtp(email, code) {
  await transporter.sendMail({
    from: EMAIL_USER,
    to: email,
    subject: `Kode verifikasi KontainerCheck: ${code}`,
    text: `Kode verifikasi KontainerCheck Anda adalah ${code}. Kode berlaku selama 10 menit.`,
    html: `<p>Kode verifikasi KontainerCheck Anda:</p><p style="font-size:24px;font-weight:700;letter-spacing:0.16em">${code}</p><p>Kode berlaku selama 10 menit.</p>`,
  });
}

export async function sendVerificationOtp(email) {
  assertEmailConfiguration();
  verifier.otp.generate(6);
  await verifier.otp.set(email);
  await deliverOtp(email, verifier.otp.code);
}

export async function resendVerificationOtp(email) {
  assertEmailConfiguration();
  const record = verifier.otp.tokenStore?.get(email);
  if (!record) {
    await sendVerificationOtp(email);
    return;
  }
  if (record.cooldownUntil && Date.now() < record.cooldownUntil) {
    const waitSeconds = Math.ceil((record.cooldownUntil - Date.now()) / 1_000);
    throw new Error(`Cooldown active. Wait ${waitSeconds} seconds before resending OTP.`);
  }

  verifier.otp.generate(6);
  await verifier.otp.set(email);
  await deliverOtp(email, verifier.otp.code);
}

export async function verifyEmailOtp(email, code) {
  return verifier.otp.verify({ check: email, code });
}
