# Email OTP Verification — Implementation Guide

> Adapted from [dev.to/jahongir2007](https://dev.to/jahongir2007/build-an-email-otp-verification-system-in-nodejs-step-by-step-1lnf)  
> Tailored for your **Vite + React** frontend with an **Express** backend API.

---

## Overview

The flow we're building:

```
User fills register form
  → POST /api/auth/register
    → Save user (is_verified = false)
    → Generate & email OTP
    → Redirect to /verify page

User enters OTP on /verify page
  → POST /api/auth/verify-otp
    → Validate OTP
    → Set is_verified = true
    → Return success / JWT

User logs in
  → POST /api/auth/login
    → Check password
    → Block if not verified
    → Return token on success
```

---

## 1. Backend Setup

### Install dependencies

```bash
npm install auth-verify nodemailer dotenv
```

| Package | Purpose |
|---|---|
| `auth-verify` | Handles OTP generation, emailing, expiry & cooldown |
| `nodemailer` | Used internally by auth-verify |
| `dotenv` | Loads Gmail credentials from `.env` |

---

### Environment variables

Add to your backend `.env`:

```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
```

> **Getting a Gmail App Password:**
> 1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
> 2. Enable **2-Step Verification** if not already on
> 3. Search for **"App passwords"**
> 4. Choose App: `Mail`, Device: `Other` → name it anything
> 5. Copy the 16-character password Google gives you
> 6. Paste it into `EMAIL_PASS` (spaces included, no quotes)

---

### Database — add `is_verified` column

If you're using MySQL/PostgreSQL, make sure your `users` table has this column:

```sql
ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
```

Or if you're creating the table fresh:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE
);
```

---

### Initialize the Verifier

Create a shared module `src/lib/verifier.js` (or wherever you keep shared utilities):

```js
// src/lib/verifier.js
require('dotenv').config();
const Verifier = require('auth-verify');

const verifier = new Verifier({
  sender: process.env.EMAIL_USER,
  pass:   process.env.EMAIL_PASS,
  serv:   'gmail',
  otp: {
    leng:     6,    // 6-digit code
    expMin:   10,   // expires in 10 minutes
    limit:    5,    // max 5 sends per session
    cooldown: 60,   // user must wait 60s between resend requests
  }
});

module.exports = verifier;
```

**Why cooldown matters:** Without it, a malicious user (or bot) could spam the "Send OTP" button, flooding your SMTP server with hundreds of emails per minute and potentially getting your Gmail account suspended.

---

### API Routes

#### `POST /api/auth/register`

```js
// routes/auth.js
const express  = require('express');
const router   = express.Router();
const db       = require('../db');       // your DB connection
const verifier = require('../lib/verifier');

router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  // 1. Check if user already exists
  const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // 2. Hash password (bcrypt recommended — not shown here)
  // const hashed = await bcrypt.hash(password, 10);

  // 3. Insert user with is_verified = false
  await db.query(
    'INSERT INTO users (email, password, is_verified) VALUES (?, ?, false)',
    [email, password /* or hashed */]
  );

  // 4. Send OTP email
  verifier
    .subject('Your verification code: {otp}')
    .text('Your one-time code is {otp}. It expires in 10 minutes.')
    .sendTo(email, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to send OTP: ' + err.message });
      }
      res.json({ message: 'OTP sent', email });
    });
});
```

---

#### `POST /api/auth/verify-otp`

```js
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  verifier.code(otp).verifyFor(email, async (err, isValid) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark user as verified
    await db.query('UPDATE users SET is_verified = true WHERE email = ?', [email]);

    res.json({ message: 'Email verified successfully' });
  });
});
```

---

#### `POST /api/auth/login`

```js
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

  const user = rows[0];

  // Password check (use bcrypt.compare if hashed)
  if (user.password !== password) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  // Block unverified users
  if (!user.is_verified) {
    return res.status(403).json({ error: 'Email not verified', needsVerification: true });
  }

  // Return token or session here
  res.json({ message: 'Login successful', userId: user.id });
});

module.exports = router;
```

Register the router in your main `index.js` / `app.js`:

```js
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
```

---

## 2. Frontend (React / Vite)

### Register Page

```jsx
// src/pages/Register.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const res  = await fetch('/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      return;
    }

    // Redirect to verify page, carry email in state
    navigate('/verify', { state: { email } });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Register</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit">Register</button>
    </form>
  );
}
```

---

### Verify OTP Page

```jsx
// src/pages/VerifyOTP.jsx
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function VerifyOTP() {
  const { state }    = useLocation();
  const email        = state?.email || '';
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError]     = useState('');
  const navigate = useNavigate();

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    const res  = await fetch('/api/auth/verify-otp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, otp }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setMessage('✅ Email verified! Redirecting to login...');
    setTimeout(() => navigate('/login'), 2000);
  };

  return (
    <form onSubmit={handleVerify}>
      <h1>Verify Your Email</h1>
      <p>A 6-digit code was sent to <strong>{email}</strong></p>
      {error   && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
      <input
        type="text"
        placeholder="Enter 6-digit OTP"
        maxLength={6}
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        required
      />
      <button type="submit">Verify</button>
    </form>
  );
}
```

---

### Login Page

```jsx
// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const res  = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      // Redirect to verify if email not yet confirmed
      if (data.needsVerification) {
        navigate('/verify', { state: { email } });
        return;
      }
      setError(data.error);
      return;
    }

    // Store token / handle session, then navigate
    navigate('/dashboard');
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Login</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

---

### Add Routes to your App

```jsx
// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register  from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';
import Login     from './pages/Login';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/verify"   element={<VerifyOTP />} />
        <Route path="/login"    element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 3. Vite Proxy (avoid CORS during dev)

In `vite.config.js`, proxy `/api` calls to your Express server:

```js
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
```

This sidesteps CORS entirely during development — fetch calls to `/api/auth/...` from React will be forwarded to your backend automatically.

---

## 4. Quick Checklist

- [ ] `auth-verify` installed on backend
- [ ] `.env` has `EMAIL_USER` and `EMAIL_PASS` (Gmail App Password)
- [ ] `users` table has `is_verified` column
- [ ] `verifier` module initialised and shared across routes
- [ ] `POST /api/auth/register` — saves user, sends OTP
- [ ] `POST /api/auth/verify-otp` — validates OTP, updates DB
- [ ] `POST /api/auth/login` — blocks unverified users
- [ ] Vite proxy configured for `/api` (dev)
- [ ] React Router routes for `/register`, `/verify`, `/login`

---

## 5. Recommended Next Steps

| Feature | How |
|---|---|
| Password hashing | `bcrypt` — `bcrypt.hash()` on register, `bcrypt.compare()` on login |
| Resend OTP button | Call the same `verifier.sendTo()` endpoint; cooldown enforces rate limiting automatically |
| JWT sessions | `jsonwebtoken` — sign a token on login success, store in `localStorage` or an httpOnly cookie |
| OTP expiry UX | Show a countdown timer on the `/verify` page using `expMin` from your verifier config |
