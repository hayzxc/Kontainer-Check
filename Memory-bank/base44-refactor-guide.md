# Base44 → Independent Code Refactor Guide

## Root Cause (from your console errors)

```
CORS policy: Request header field x-origin-url is not allowed
by Access-Control-Allow-Headers in preflight response.
[Base44 SDK Error] undefined: Network Error
```

The Base44 SDK injects a custom `x-origin-url` header that your backend does **not** whitelist in its CORS config. This blocks every preflight request, including login. Replace the SDK with plain `fetch`/`axios` calls — no custom headers, no SDK dependency.

---

## Step 1 — Remove Base44 SDK

```bash
npm uninstall @base44/sdk   # or whatever the package name is
# also remove from yarn.lock / package-lock.json
```

Search your project for every import and delete them:

```bash
grep -r "base44" src/ --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" -l
```

---

## Step 2 — Auth: Replace Base44 Login

### Before (Base44)
```js
import { Base44Client } from "@base44/sdk";
const client = new Base44Client({ appId: "6a262ce..." });
await client.auth.login({ email, password });
```

### After (independent)
```js
// src/lib/api.js  (or api.ts)

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8789";

export async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/apps/6a262ce/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // ✅ NO x-origin-url or other custom headers
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `Login failed: ${res.status}`);
  }

  const data = await res.json();
  // Store token however you like
  localStorage.setItem("token", data.token);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
}

export function getToken() {
  return localStorage.getItem("token");
}
```

---

## Step 3 — Authenticated Requests

### Before (Base44)
```js
const users = await client.entities.User.list();
```

### After (independent)
```js
// src/lib/api.js  — add below login()

export async function apiFetch(path, options = {}) {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,          // caller overrides last
    },
  });

  if (res.status === 401) {
    logout();
    window.location.href = "/login";
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `API error: ${res.status}`);
  }

  return res.json();
}

// Convenience wrappers
export const api = {
  get:    (path)        => apiFetch(path),
  post:   (path, body)  => apiFetch(path, { method: "POST",   body: JSON.stringify(body) }),
  put:    (path, body)  => apiFetch(path, { method: "PUT",    body: JSON.stringify(body) }),
  patch:  (path, body)  => apiFetch(path, { method: "PATCH",  body: JSON.stringify(body) }),
  delete: (path)        => apiFetch(path, { method: "DELETE" }),
};
```

### Usage examples

```js
import { api } from "@/lib/api";

// List users
const users = await api.get("/api/apps/6a262ce/entities/User");

// Create user
const newUser = await api.post("/api/apps/6a262ce/entities/User", {
  name: "Alice",
  email: "alice@example.com",
});

// Analytics track
await api.post("/api/apps/6a262ce/analytics/track/batch", { events });
```

---

## Step 4 — Fix Login Component

```jsx
// src/pages/Login.jsx
import { useState } from "react";
import { login } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");           // ← your protected route
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
```

---

## Step 5 — Fix CORS on Your Backend (Important)

Even after removing the Base44 SDK, ensure your backend allows the headers you actually send. Minimum CORS config:

### Express (Node.js)
```js
import cors from "cors";

app.use(cors({
  origin: ["http://127.0.0.1:5176", "http://localhost:5176"], // your frontend origin
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
```

### FastAPI (Python)
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5176", "http://localhost:5176"],
    allow_methods=["*"],
    allow_headers=["Content-Type", "Authorization"],
    allow_credentials=True,
)
```

### Django
```python
# settings.py
CORS_ALLOWED_ORIGINS = ["http://127.0.0.1:5176"]
CORS_ALLOW_HEADERS = ["content-type", "authorization"]
```

> ⚠️ **Do NOT add `x-origin-url` to your allowedHeaders.** Just drop it entirely by replacing the Base44 SDK.

---

## Step 6 — Environment Variable

Create / update `.env`:

```env
VITE_API_URL=http://127.0.0.1:8789
```

For production:

```env
VITE_API_URL=https://api.yourdomain.com
```

---

## Step 7 — Replace Analytics Calls

### Before (Base44)
```js
client.analytics.track("event_name", { prop: "value" });
```

### After
```js
// src/lib/analytics.js
import { api } from "./api";

export function track(eventName, properties = {}) {
  // Fire-and-forget; don't block UI on analytics
  api.post("/api/apps/6a262ce/analytics/track/batch", {
    events: [{ name: eventName, properties, timestamp: Date.now() }],
  }).catch(console.warn);
}
```

---

## Checklist

- [ ] Uninstall `@base44/sdk` (or equivalent package)
- [ ] Create `src/lib/api.js` with `login`, `apiFetch`, `api` helpers
- [ ] Update Login page to use new `login()` function
- [ ] Replace all `client.entities.*` calls with `api.get/post/put/delete`
- [ ] Replace all `client.analytics.*` calls with new `track()` helper
- [ ] Set `VITE_API_URL` in `.env`
- [ ] Update backend CORS to allow only `Content-Type` + `Authorization`
- [ ] Remove any remaining `x-origin-url` references from codebase
- [ ] Re-test login in browser — no CORS errors should appear

---

## Quick Grep to Find Remaining Base44 References

```bash
# Find any leftover Base44 usage
grep -rn "base44\|Base44\|x-origin-url" src/ --include="*.{js,ts,jsx,tsx}"
```

All results must be zero before deploying.
