import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY || 100);
const baseUrl = (process.env.LOAD_TEST_BASE_URL || 'http://127.0.0.1:8789').replace(/\/$/, '');
const appId = process.env.LOAD_TEST_APP_ID || '6a262ce8fe5781a4fc436536';
const timeoutMs = Number(process.env.LOAD_TEST_TIMEOUT_MS || 10_000);
const reportPath = process.env.LOAD_TEST_REPORT || 'reports/login-load-report.json';
const userFile = process.env.LOAD_TEST_USERS_FILE;

if (!Number.isInteger(concurrency) || concurrency < 1) {
  throw new Error('LOAD_TEST_CONCURRENCY must be a positive integer');
}

const defaultUsers = [
  { email: 'admin@example.com', password: 'password123' },
  { email: 'inspector@example.com', password: 'password123' },
  { email: 'auditor@example.com', password: 'password123' },
  { email: 'shipper@example.com', password: 'password123' },
];

async function loadUsers() {
  if (!userFile) return defaultUsers;
  const users = JSON.parse(await readFile(userFile, 'utf8'));
  if (!Array.isArray(users) || users.length === 0 || users.some((user) => !user.email || !user.password)) {
    throw new Error('LOAD_TEST_USERS_FILE must contain a JSON array of { "email", "password" } objects');
  }
  return users;
}

function percentile(values, p) {
  if (!values.length) return null;
  const position = Math.ceil((p / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(position, values.length - 1))];
}

async function login(user, releaseAt) {
  const wait = releaseAt - performance.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));

  const startedAt = performance.now();
  try {
    const response = await fetch(`${baseUrl}/api/apps/${appId}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await response.json().catch(() => null);
    return {
      status: response.status,
      ok: response.ok && Boolean(body?.access_token),
      latency_ms: Number((performance.now() - startedAt).toFixed(2)),
      started_offset_ms: Number((startedAt - releaseAt).toFixed(2)),
      error: response.ok ? null : (body?.message || `HTTP ${response.status}`),
    };
  } catch (error) {
    return {
      status: null,
      ok: false,
      latency_ms: Number((performance.now() - startedAt).toFixed(2)),
      started_offset_ms: Number((startedAt - releaseAt).toFixed(2)),
      error: error.name === 'TimeoutError' ? `Timed out after ${timeoutMs} ms` : error.message,
    };
  }
}

const users = await loadUsers();
const releaseAt = performance.now() + 250;
const suiteStartedAt = new Date().toISOString();
const results = await Promise.all(
  Array.from({ length: concurrency }, (_, index) => login(users[index % users.length], releaseAt)),
);

const sortedLatencies = results.map((result) => result.latency_ms).sort((a, b) => a - b);
const successful = results.filter((result) => result.ok);
const failed = results.filter((result) => !result.ok);
const elapsedMs = Math.max(...results.map((result) => result.latency_ms + Math.max(0, result.started_offset_ms)));
const report = {
  scenario: '100 simultaneous login requests',
  target: `${baseUrl}/api/apps/${appId}/auth/login`,
  started_at: suiteStartedAt,
  completed_at: new Date().toISOString(),
  configuration: {
    concurrent_users: concurrency,
    distinct_credentials_supplied: users.length,
    request_timeout_ms: timeoutMs,
  },
  result: {
    passed: failed.length === 0,
    total_requests: results.length,
    successful_logins: successful.length,
    failed_logins: failed.length,
    success_rate_percent: Number(((successful.length / results.length) * 100).toFixed(2)),
    client_start_spread_ms: Number((Math.max(...results.map((r) => r.started_offset_ms)) - Math.min(...results.map((r) => r.started_offset_ms))).toFixed(2)),
    estimated_test_duration_ms: Number(elapsedMs.toFixed(2)),
    latency_ms: {
      min: sortedLatencies[0],
      average: Number((sortedLatencies.reduce((sum, value) => sum + value, 0) / sortedLatencies.length).toFixed(2)),
      p50: percentile(sortedLatencies, 50),
      p95: percentile(sortedLatencies, 95),
      p99: percentile(sortedLatencies, 99),
      max: sortedLatencies.at(-1),
    },
    failures: failed.map(({ status, error, latency_ms }) => ({ status, error, latency_ms })),
  },
};

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

process.exitCode = report.result.passed ? 0 : 1;
