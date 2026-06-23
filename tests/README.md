# Concurrent login load test

This test sends 100 login requests on a common client-side release barrier and writes a JSON report with throughput, latency percentiles, start spread, and failures.

Run it against the local backend:

```powershell
$env:LOAD_TEST_BASE_URL = 'http://127.0.0.1:8789'
npm run test:login-load
```

The default uses the four seeded local accounts in rotation. This represents 100 simultaneous client sessions, but not 100 different identities. For a true 100-distinct-user run, provide a non-production JSON credential file:

```json
[
  { "email": "loadtest-001@example.test", "password": "..." },
  { "email": "loadtest-002@example.test", "password": "..." }
]
```

```powershell
$env:LOAD_TEST_USERS_FILE = 'C:\secure\load-test-users.json'
npm run test:login-load
```

Configuration: `LOAD_TEST_CONCURRENCY` (default `100`), `LOAD_TEST_TIMEOUT_MS` (default `10000`), `LOAD_TEST_APP_ID`, and `LOAD_TEST_REPORT` (default `reports/login-load-report.json`). Only run this against an authorized environment: each successful request creates a session token and audit record.
