import http from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { resendVerificationOtp, sendVerificationOtp, verifyEmailOtp } from './verifier.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(__dirname, 'data');
const uploadDir = path.join(rootDir, 'public', 'uploads');
const dbPath = process.env.DB_PATH || path.join(dataDir, 'db.json');

const PORT = Number(process.env.PORT || 8789);
const HOST = process.env.HOST || '127.0.0.1';
const APP_ORIGIN = process.env.APP_ORIGIN || 'http://127.0.0.1:5173';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || APP_ORIGIN;
const CORS_ALLOW_HEADERS = [
  'Content-Type',
  'Authorization',
].join(', ');
const CORS_ALLOW_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';

const ENTITY_TABLES = {
  User: 'users',
  InspectionSession: 'inspection_sessions',
  InspectionPhoto: 'inspection_photos',
  AuditLog: 'audit_logs',
};

const SESSION_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'clarification'];
const INSPECTION_TYPES = ['arrival', 'departure', 'periodic'];
const PHOTO_ANGLES = ['front', 'back', 'left', 'right', 'interior', 'serial', 'other'];
const AUDIT_ACTIONS = ['create', 'update', 'delete', 'export', 'login', 'verify', 'submit', 'upload'];
const SESSION_EDITABLE_FIELDS = [
  'container_id', 'shipper_name', 'inspection_type', 'location_name',
  'latitude', 'longitude', 'notes', 'ocr_serial',
];
const SESSION_CREATE_FIELDS = [...SESSION_EDITABLE_FIELDS];
const PHOTO_EDITABLE_FIELDS = [
  'photo_url', 'photo_angle', 'file_size_kb', 'resolution', 'device_info',
  'ocr_detected_serial', 'ocr_confirmed_serial', 'ocr_confidence',
  'ocr_processed', 'is_corrected', 'damage_labels',
];

let db = null;

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt] = String(stored || '').split(':');
  if (!salt) return false;
  const candidate = Buffer.from(hashPassword(password, salt));
  const expected = Buffer.from(String(stored));
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function publicUser(user) {
  if (!user) return null;
  const { password_hash, reset_token, ...safe } = user;
  return safe;
}

async function loadDb() {
  await mkdir(dataDir, { recursive: true });
  await mkdir(uploadDir, { recursive: true });
  try {
    db = JSON.parse(await readFile(dbPath, 'utf8'));
  } catch {
    db = {
      users: [],
      inspection_sessions: [],
      inspection_photos: [],
      audit_logs: [],
      tokens: {},
    };
  }

  const seeds = [
    ['admin@example.com', 'Admin User', 'admin'],
    ['inspector@example.com', 'Inspector User', 'inspector'],
    ['auditor@example.com', 'Auditor User', 'auditor'],
    ['shipper@example.com', 'Shipper User', 'shipper'],
  ];

  let changed = false;
  for (const user of db.users) {
    if (user.is_verified == null) {
      user.is_verified = Boolean(user.verified);
      changed = true;
    }
  }
  for (const [email, name, role] of seeds) {
    if (!db.users.some((user) => user.email === email)) {
      db.users.push({
        id: id('usr'),
        email,
        name,
        full_name: name,
        role,
        password_hash: hashPassword('password123'),
        verified: true,
        is_verified: true,
        created_date: now(),
        updated_date: now(),
      });
      changed = true;
    }
  }

  if (changed) await saveDb();
}

async function saveDb() {
  await writeFile(dbPath, JSON.stringify(db, null, 2));
}

function send(res, status, body, headers = {}) {
  const data = body == null ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': res.corsOrigin || APP_ORIGIN,
    'Access-Control-Allow-Headers': CORS_ALLOW_HEADERS,
    'Access-Control-Allow-Methods': CORS_ALLOW_METHODS,
    Vary: 'Origin',
    ...headers,
  });
  res.end(data);
}

function getCorsOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return APP_ORIGIN;
  if (/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) return origin;
  return APP_ORIGIN;
}

function error(res, status, message, code = undefined) {
  send(res, status, { message, code });
}

function routeInfo() {
  return {
    name: 'Kontainer Check Backend',
    status: 'ok',
    health: '/health',
    app_api: {
      auth: [
        'POST /api/apps/:appId/auth/login',
        'POST /api/apps/:appId/auth/register',
        'POST /api/apps/:appId/auth/verify-otp',
        'POST /api/apps/:appId/auth/resend-otp',
        'POST /api/apps/:appId/auth/reset-password-request',
        'POST /api/apps/:appId/auth/reset-password',
        'GET /api/apps/:appId/entities/User/me',
      ],
      entities: [
        'GET /api/apps/:appId/entities/:entityName',
        'GET /api/apps/:appId/entities/:entityName/:id',
        'POST /api/apps/:appId/entities/:entityName',
        'PUT /api/apps/:appId/entities/:entityName/:id',
        'DELETE /api/apps/:appId/entities/:entityName/:id',
      ],
      integrations: [
        'POST /api/apps/:appId/integration-endpoints/Core/UploadFile',
        'POST /api/apps/:appId/integration-endpoints/Core/InvokeLLM',
      ],
    },
    rest_api: [
      'GET /api/inspection-sessions',
      'POST /api/inspection-sessions',
      'GET /api/inspection-sessions/:id',
      'PATCH /api/inspection-sessions/:id',
      'POST /api/inspection-sessions/:id/submit',
      'POST /api/inspection-sessions/:id/photos',
      'POST /api/inspection-sessions/:id/verify',
      'GET /api/photos/:id',
      'POST /api/photos/:id/ocr',
      'GET /api/audit-logs',
    ],
    seed_users: [
      'admin@example.com / password123',
      'inspector@example.com / password123',
      'auditor@example.com / password123',
      'shipper@example.com / password123',
    ],
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function readJson(req) {
  const body = await readBody(req);
  if (!body.length) return {};
  return JSON.parse(body.toString('utf8'));
}

function getAuthUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const userId = token ? db.tokens[token] : null;
  return db.users.find((user) => user.id === userId) || null;
}

function requireUser(req, res) {
  const user = getAuthUser(req);
  if (!user) {
    error(res, 401, 'Authentication required', 'AUTH_REQUIRED');
    return null;
  }
  return user;
}

function hasRole(user, roles) {
  return user && roles.includes(user.role);
}

function canReadSession(user, session) {
  return hasRole(user, ['admin', 'auditor']) || session.created_by_id === user?.id;
}

function canUpdateSession(user, session) {
  return hasRole(user, ['admin']) || (
    session.created_by_id === user?.id &&
    ['draft', 'clarification'].includes(session.status)
  );
}

function canReadPhoto(user, photo) {
  return hasRole(user, ['admin', 'auditor']) || photo.created_by_id === user?.id;
}

function canUpdatePhoto(user, photo) {
  if (hasRole(user, ['admin'])) return true;
  const session = db.inspection_sessions.find((row) => row.id === photo.session_id);
  return photo.created_by_id === user?.id && Boolean(session) && canUpdateSession(user, session);
}

function canReadAudit(user) {
  return hasRole(user, ['admin', 'auditor']);
}

function tableForEntity(entityName) {
  return ENTITY_TABLES[entityName];
}

function tableRows(table, user) {
  const rows = db[table] || [];
  if (table === 'inspection_sessions') return rows.filter((row) => canReadSession(user, row));
  if (table === 'inspection_photos') return rows.filter((row) => canReadPhoto(user, row));
  if (table === 'audit_logs') return canReadAudit(user) ? rows : [];
  if (table === 'users') return hasRole(user, ['admin']) ? rows.map(publicUser) : rows.filter((row) => row.id === user?.id).map(publicUser);
  return rows;
}

function matchesQuery(row, query) {
  return Object.entries(query || {}).every(([key, value]) => row[key] === value);
}

function sortRows(rows, sort) {
  if (!sort) return rows;
  const desc = sort.startsWith('-');
  const key = desc ? sort.slice(1) : sort;
  return [...rows].sort((a, b) => {
    const av = a[key] ?? '';
    const bv = b[key] ?? '';
    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });
}

function applyListParams(rows, url) {
  let result = rows;
  const q = url.searchParams.get('q');
  if (q) result = result.filter((row) => matchesQuery(row, JSON.parse(q)));
  result = sortRows(result, url.searchParams.get('sort'));
  const skip = Number(url.searchParams.get('skip') || 0);
  const limit = url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : null;
  if (skip) result = result.slice(skip);
  if (limit) result = result.slice(0, limit);
  return result;
}

async function audit(action, entityType, entityId, user, details = '') {
  if (!AUDIT_ACTIONS.includes(action)) return;
  db.audit_logs.push({
    id: id('log'),
    action,
    entity_type: entityType,
    entity_id: entityId,
    user_name: user?.full_name || user?.name || user?.email || 'System',
    details,
    created_by_id: user?.id || null,
    created_at: now(),
    created_date: now(),
    updated_date: now(),
  });
}

function validateSession(data, partial = false) {
  const required = ['container_id', 'inspection_type', 'location_name'];
  if (!partial) {
    for (const key of required) {
      if (!data[key]) throw new Error(`${key} is required`);
    }
  }
  if (data.inspection_type && !INSPECTION_TYPES.includes(data.inspection_type)) throw new Error('Invalid inspection_type');
  if (data.status && !SESSION_STATUSES.includes(data.status)) throw new Error('Invalid status');
}

function validatePhoto(data, partial = false) {
  const required = ['session_id', 'photo_url', 'photo_angle'];
  if (!partial) {
    for (const key of required) {
      if (!data[key]) throw new Error(`${key} is required`);
    }
  }
  if (data.photo_angle && !PHOTO_ANGLES.includes(data.photo_angle)) throw new Error('Invalid photo_angle');
}

function createSession(data, user) {
  rejectUnknownFields(data, SESSION_CREATE_FIELDS);
  validateSession(data);
  return {
    id: id('ses'),
    container_id: data.container_id,
    shipper_name: data.shipper_name || '',
    inspection_type: data.inspection_type,
    location_name: data.location_name,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    status: 'draft',
    notes: data.notes || '',
    verified_by_name: '',
    verified_at: null,
    admin_comment: '',
    inspector_name: user.full_name || user.name || user.email,
    photo_count: 0,
    ocr_serial: data.ocr_serial || '',
    archived: false,
    created_by_id: user.id,
    created_date: now(),
    updated_date: now(),
  };
}

function createPhoto(data, user) {
  validatePhoto(data);
  const session = db.inspection_sessions.find((row) => row.id === data.session_id);
  if (!session) throw new Error('Session not found');
  if (!canUpdateSession(user, session)) throw new Error('Session cannot be changed');
  return {
    id: id('pho'),
    session_id: data.session_id,
    photo_url: data.photo_url,
    photo_angle: data.photo_angle,
    file_size_kb: data.file_size_kb || 0,
    resolution: data.resolution || '',
    device_info: data.device_info || '',
    ocr_detected_serial: data.ocr_detected_serial || '',
    ocr_confirmed_serial: data.ocr_confirmed_serial || '',
    ocr_confidence: data.ocr_confidence || 0,
    ocr_processed: Boolean(data.ocr_processed),
    is_corrected: Boolean(data.is_corrected),
    damage_labels: Array.isArray(data.damage_labels) ? data.damage_labels : [],
    created_by_id: user.id,
    created_date: now(),
    updated_date: now(),
  };
}

function hasOwn(data, key) {
  return Object.prototype.hasOwnProperty.call(data, key);
}

function rejectUnknownFields(data, allowedFields) {
  const unknown = Object.keys(data).filter((key) => !allowedFields.includes(key));
  if (unknown.length) throw new Error(`Field not writable: ${unknown[0]}`);
}

function sessionUpdates(data, user, session) {
  const allowedFields = [...SESSION_EDITABLE_FIELDS, 'archived'];
  rejectUnknownFields(data, allowedFields);

  const hasContentUpdate = SESSION_EDITABLE_FIELDS.some((key) => hasOwn(data, key));
  if (hasContentUpdate && !canUpdateSession(user, session)) {
    throw new Error('Not allowed to update this session');
  }
  if (hasOwn(data, 'archived') && !(hasRole(user, ['admin']) || session.created_by_id === user?.id)) {
    throw new Error('Not allowed to archive this session');
  }

  const updates = {};
  for (const key of SESSION_EDITABLE_FIELDS) {
    if (hasOwn(data, key)) updates[key] = data[key];
  }
  if (hasOwn(data, 'archived')) updates.archived = Boolean(data.archived);
  validateSession(updates, true);
  return updates;
}

function photoUpdates(data) {
  rejectUnknownFields(data, PHOTO_EDITABLE_FIELDS);
  const updates = {};
  for (const key of PHOTO_EDITABLE_FIELDS) {
    if (hasOwn(data, key)) updates[key] = data[key];
  }
  validatePhoto(updates, true);
  if (hasOwn(updates, 'damage_labels') && !Array.isArray(updates.damage_labels)) {
    throw new Error('damage_labels must be an array');
  }
  return updates;
}

function parseMultipart(buffer, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!match) return {};
  const boundary = `--${match[1] || match[2]}`;
  const raw = buffer.toString('binary');
  const parts = raw.split(boundary).slice(1, -1);
  const fields = {};
  for (const part of parts) {
    const cleaned = part.replace(/^\r\n/, '').replace(/\r\n$/, '');
    const splitAt = cleaned.indexOf('\r\n\r\n');
    if (splitAt < 0) continue;
    const headerText = cleaned.slice(0, splitAt);
    const content = cleaned.slice(splitAt + 4);
    const name = /name="([^"]+)"/.exec(headerText)?.[1];
    const filename = /filename="([^"]*)"/.exec(headerText)?.[1];
    const type = /Content-Type:\s*([^\r\n]+)/i.exec(headerText)?.[1] || 'application/octet-stream';
    if (!name) continue;
    if (filename) {
      fields[name] = {
        filename,
        contentType: type,
        buffer: Buffer.from(content, 'binary'),
      };
    } else {
      fields[name] = content;
    }
  }
  return fields;
}

async function handleUpload(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  const body = await readBody(req);
  const fields = parseMultipart(body, req.headers['content-type']);
  const file = fields.file;
  if (!file?.buffer) return error(res, 400, 'file is required');
  const ext = path.extname(file.filename || '') || '.bin';
  const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  await writeFile(path.join(uploadDir, filename), file.buffer);
  await audit('upload', 'photo', filename, user, `Uploaded ${file.filename}`);
  await saveDb();
  send(res, 201, { file_url: `${PUBLIC_BASE_URL}/uploads/${filename}` });
}

function fakeLLMResponse(body) {
  const prompt = String(body.prompt || '');
  if (/damage|kerusakan/i.test(prompt)) return { damages: [] };
  return { detected_serial: '', confidence: 0 };
}

async function handleAuth(req, res, method, segments) {
  const action = segments[4];
  if (method === 'POST' && action === 'register') {
    const body = await readJson(req);
    if (!body.email || !body.password) return error(res, 400, 'email and password are required');
    if (db.users.some((user) => user.email.toLowerCase() === body.email.toLowerCase())) {
      return error(res, 409, 'Email already registered', 'EMAIL_EXISTS');
    }
    const user = {
      id: id('usr'),
      email: body.email.toLowerCase(),
      name: body.name || body.full_name || body.email,
      full_name: body.full_name || body.name || body.email,
      role: body.role && ['inspector', 'shipper'].includes(body.role) ? body.role : 'inspector',
      password_hash: hashPassword(body.password),
      verified: false,
      is_verified: false,
      created_date: now(),
      updated_date: now(),
    };
    db.users.push(user);
    try {
      await sendVerificationOtp(user.email);
      await saveDb();
      return send(res, 201, { message: 'Verification code sent' });
    } catch (err) {
      await saveDb();
      console.error('Verification email delivery failed:', err.message);
      return error(res, 503, 'Verification email could not be sent. Please try again later.');
    }
  }

  if (method === 'POST' && action === 'verify-otp') {
    const body = await readJson(req);
    const user = db.users.find((row) => row.email === String(body.email || '').toLowerCase());
    if (!user) return error(res, 400, 'Invalid or expired verification code');
    try {
      await verifyEmailOtp(user.email, body.otp_code);
      user.verified = true;
      user.is_verified = true;
      user.updated_date = now();
      await audit('verify', 'user', user.id, user, 'Verified email address');
      await saveDb();
      return send(res, 200, { message: 'Email verified successfully' });
    } catch (err) {
      return error(res, 400, err.message === 'OTP expired' ? 'Verification code has expired. Request a new code.' : 'Invalid or expired verification code');
    }
  }

  if (method === 'POST' && action === 'resend-otp') {
    const body = await readJson(req);
    const user = db.users.find((row) => row.email === String(body.email || '').toLowerCase());
    if (!user || user.is_verified || user.verified) return send(res, 200, { message: 'If an unverified account exists, a verification code has been sent.' });
    try {
      await resendVerificationOtp(user.email);
      user.updated_date = now();
      await saveDb();
      return send(res, 200, { message: 'Verification code sent' });
    } catch (err) {
      console.error('Verification email resend failed:', err.message);
      const status = /Cooldown active/.test(err.message) ? 429 : 503;
      return error(res, status, status === 429 ? err.message : 'Verification email could not be sent. Please try again later.');
    }
  }

  if (method === 'POST' && action === 'login') {
    const body = await readJson(req);
    const user = db.users.find((row) => row.email === String(body.email || '').toLowerCase());
    if (!user || !verifyPassword(body.password || '', user.password_hash)) return error(res, 401, 'Invalid email or password');
    if (!user.is_verified && !user.verified) return send(res, 403, { message: 'Email is not verified', needsVerification: true });
    const token = crypto.randomBytes(32).toString('hex');
    db.tokens[token] = user.id;
    await audit('login', 'user', user.id, user, 'Logged in');
    await saveDb();
    return send(res, 200, { access_token: token, user: publicUser(user) });
  }

  if (method === 'POST' && action === 'reset-password-request') {
    const body = await readJson(req);
    const user = db.users.find((row) => row.email === String(body.email || '').toLowerCase());
    if (user) user.reset_token = 'dev-reset-token';
    await saveDb();
    return send(res, 200, { message: 'Reset link sent', dev_reset_token: 'dev-reset-token' });
  }

  if (method === 'POST' && action === 'reset-password') {
    const body = await readJson(req);
    const user = db.users.find((row) => row.reset_token === body.reset_token);
    if (!user) return error(res, 400, 'Invalid reset token');
    user.password_hash = hashPassword(body.new_password);
    user.reset_token = null;
    user.updated_date = now();
    await saveDb();
    return send(res, 200, { message: 'Password updated' });
  }

  return error(res, 404, 'Auth route not found');
}

async function handleEntity(req, res, method, url, segments) {
  const user = requireUser(req, res);
  if (!user) return;

  const entityName = segments[4];
  const table = tableForEntity(entityName);
  if (!table) return error(res, 404, 'Entity not found');

  if (entityName === 'User' && segments[5] === 'me') {
    if (method === 'GET') return send(res, 200, publicUser(user));
    if (method === 'PUT') {
      const body = await readJson(req);
      Object.assign(user, { name: body.name ?? user.name, full_name: body.full_name ?? user.full_name, updated_date: now() });
      await saveDb();
      return send(res, 200, publicUser(user));
    }
  }

  const entityId = segments[5];
  if (method === 'GET' && !entityId) return send(res, 200, applyListParams(tableRows(table, user), url));

  if (method === 'GET' && entityId) {
    const row = tableRows(table, user).find((item) => item.id === entityId);
    return row ? send(res, 200, row) : error(res, 404, 'Entity not found');
  }

  if (method === 'POST' && !entityId) {
    const body = await readJson(req);
    try {
      let row;
      if (table === 'inspection_sessions') {
        row = createSession(body, user);
        db[table].push(row);
        await audit('create', 'inspection_session', row.id, user, `Created inspection ${row.container_id}`);
      } else if (table === 'inspection_photos') {
        row = createPhoto(body, user);
        db[table].push(row);
        const session = db.inspection_sessions.find((item) => item.id === row.session_id);
        if (session) {
          session.photo_count = db.inspection_photos.filter((photo) => photo.session_id === session.id).length;
          session.updated_date = now();
        }
        await audit('upload', 'photo', row.id, user, `Uploaded ${row.photo_angle} photo`);
      } else {
        return error(res, 403, 'This entity is server-managed');
      }
      await saveDb();
      return send(res, 201, row);
    } catch (err) {
      return error(res, 400, err.message);
    }
  }

  if ((method === 'PUT' || method === 'PATCH') && entityId) {
    const row = db[table].find((item) => item.id === entityId);
    if (!row) return error(res, 404, 'Entity not found');
    if (table === 'users' || table === 'audit_logs') return error(res, 403, 'This entity is server-managed');
    if (table === 'inspection_photos' && !canUpdatePhoto(user, row)) return error(res, 403, 'Not allowed to update this photo');
    const body = await readJson(req);
    try {
      const updates = table === 'inspection_sessions'
        ? sessionUpdates(body, user, row)
        : photoUpdates(body);
      Object.assign(row, updates, { updated_date: now() });
      await audit('update', table === 'inspection_sessions' ? 'inspection_session' : 'photo', row.id, user, 'Updated entity');
      await saveDb();
      return send(res, 200, row);
    } catch (err) {
      return error(res, /^Not allowed/.test(err.message) ? 403 : 400, err.message);
    }
  }

  if (method === 'DELETE' && entityId) {
    const row = db[table].find((item) => item.id === entityId);
    if (!row) return error(res, 404, 'Entity not found');
    if (table === 'users' || table === 'audit_logs') return error(res, 403, 'This entity is server-managed');
    if (table === 'inspection_sessions' && !hasRole(user, ['admin'])) return error(res, 403, 'Admin only');
    if (table === 'inspection_photos' && !canUpdatePhoto(user, row)) return error(res, 403, 'Not allowed');
    db[table] = db[table].filter((item) => item.id !== entityId);
    await audit('delete', table, entityId, user, 'Deleted entity');
    await saveDb();
    return send(res, 200, { success: true });
  }

  return error(res, 404, 'Entity route not found');
}

async function handleRestApi(req, res, method, url, segments) {
  const user = requireUser(req, res);
  if (!user) return;

  if (segments[1] === 'inspection-sessions') {
    const sessionId = segments[2];
    const action = segments[3];

    if (method === 'GET' && !sessionId) return send(res, 200, applyListParams(tableRows('inspection_sessions', user), url));
    if (method === 'POST' && !sessionId) {
      try {
        const row = createSession(await readJson(req), user);
        db.inspection_sessions.push(row);
        await audit('create', 'inspection_session', row.id, user, `Created inspection ${row.container_id}`);
        await saveDb();
        return send(res, 201, row);
      } catch (err) {
        return error(res, /^Not allowed/.test(err.message) ? 403 : 400, err.message);
      }
    }

    const session = db.inspection_sessions.find((row) => row.id === sessionId);
    if (!session || !canReadSession(user, session)) return error(res, 404, 'Session not found');

    if (method === 'GET' && !action) return send(res, 200, session);
    if (method === 'PATCH' && !action) {
      const body = await readJson(req);
      try {
        Object.assign(session, sessionUpdates(body, user, session), { updated_date: now() });
        await audit('update', 'inspection_session', session.id, user, 'Updated inspection');
        await saveDb();
        return send(res, 200, session);
      } catch (err) {
        return error(res, 400, err.message);
      }
    }
    if (method === 'POST' && action === 'submit') {
      if (session.created_by_id !== user.id) return error(res, 403, 'Only the owner can submit');
      if (!['draft', 'clarification'].includes(session.status)) return error(res, 409, 'Only draft or clarification sessions can be submitted');
      session.status = 'pending';
      session.updated_date = now();
      await audit('submit', 'inspection_session', session.id, user, `Submitted inspection ${session.container_id}`);
      await saveDb();
      return send(res, 200, session);
    }
    if (method === 'POST' && action === 'verify') {
      if (!hasRole(user, ['admin'])) return error(res, 403, 'Admin only');
      if (!['pending', 'clarification'].includes(session.status)) return error(res, 409, 'Only pending or clarification sessions can be verified');
      const body = await readJson(req);
      const status = { approve: 'approved', reject: 'rejected', clarify: 'clarification' }[body.decision];
      if (!status) return error(res, 400, 'decision must be approve, reject, or clarify');
      session.status = status;
      session.admin_comment = body.admin_comment || '';
      session.verified_by_name = user.full_name || user.name || user.email;
      session.verified_at = now();
      session.updated_date = now();
      await audit('verify', 'inspection_session', session.id, user, `Decision: ${body.decision}`);
      await saveDb();
      return send(res, 200, session);
    }
    if (method === 'POST' && action === 'photos') {
      return handleUpload(req, res);
    }
  }

  if (segments[1] === 'photos' && segments[2]) {
    const photo = db.inspection_photos.find((row) => row.id === segments[2]);
    if (!photo || !canReadPhoto(user, photo)) return error(res, 404, 'Photo not found');
    if (method === 'GET') return send(res, 200, photo);
    if (method === 'POST' && segments[3] === 'ocr') {
      const body = await readJson(req);
      if (!canUpdatePhoto(user, photo)) return error(res, 403, 'Not allowed');
      if (body.action === 'rerun') {
        photo.ocr_processed = true;
        photo.ocr_confidence = photo.ocr_confidence || 0;
      } else {
        Object.assign(photo, {
          ocr_confirmed_serial: body.ocr_confirmed_serial ?? photo.ocr_confirmed_serial,
          is_corrected: body.is_corrected ?? photo.is_corrected,
          ocr_processed: true,
        });
      }
      photo.updated_date = now();
      await audit('update', 'photo', photo.id, user, 'Updated OCR fields');
      await saveDb();
      return send(res, 200, photo);
    }
  }

  if (segments[1] === 'audit-logs' && method === 'GET') {
    if (!canReadAudit(user)) return error(res, 403, 'Admin or auditor only');
    return send(res, 200, applyListParams(db.audit_logs, url));
  }

  return error(res, 404, 'API route not found');
}

async function router(req, res) {
  const method = req.method;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const segments = url.pathname.split('/').filter(Boolean);
  res.corsOrigin = getCorsOrigin(req);

  if (url.pathname === '/') return send(res, 200, routeInfo());
  if (method === 'OPTIONS') return send(res, 204, null);
  if (url.pathname === '/health') return send(res, 200, { ok: true });
  if (url.pathname === '/api' || /^\/api\/apps\/[^/]+\/?$/.test(url.pathname)) {
    return send(res, 200, routeInfo());
  }

  if (segments[0] === 'uploads') {
    const filePath = path.join(uploadDir, segments.slice(1).join('/'));
    if (!filePath.startsWith(uploadDir)) return error(res, 400, 'Invalid path');
    const stream = createReadStream(filePath);
    stream.on('error', () => error(res, 404, 'File not found'));
    res.writeHead(200, { 'Access-Control-Allow-Origin': APP_ORIGIN });
    return stream.pipe(res);
  }

  try {
    if (segments[0] === 'api' && segments[1] === 'apps' && segments[2] === 'auth' && segments[3] === 'logout') {
      const fromUrl = url.searchParams.get('from_url') || APP_ORIGIN;
      res.writeHead(302, {
        Location: fromUrl,
        'Access-Control-Allow-Origin': res.corsOrigin || APP_ORIGIN,
      });
      return res.end();
    }
    if (segments[0] === 'api' && segments[1] === 'apps' && segments[2] === 'auth' && segments[3] === 'login') {
      const fromUrl = url.searchParams.get('from_url') || APP_ORIGIN;
      res.writeHead(302, {
        Location: fromUrl,
        'Access-Control-Allow-Origin': res.corsOrigin || APP_ORIGIN,
      });
      return res.end();
    }
    if (segments[0] === 'api' && segments[1] === 'apps' && segments[3] === 'auth') {
      return handleAuth(req, res, method, segments);
    }
    if (segments[0] === 'api' && segments[1] === 'apps' && segments[3] === 'entities') {
      return handleEntity(req, res, method, url, segments);
    }
    if (segments[0] === 'api' && segments[1] === 'apps' && segments[3] === 'integration-endpoints' && segments[4] === 'Core') {
      if (segments[5] === 'UploadFile') return handleUpload(req, res);
      if (segments[5] === 'InvokeLLM') return send(res, 200, fakeLLMResponse(await readJson(req)));
    }
    if (segments[0] === 'api' && segments[1] === 'apps' && segments[3] === 'analytics' && segments[4] === 'track' && segments[5] === 'batch') {
      return send(res, 200, { success: true });
    }
    if (segments[0] === 'api') return handleRestApi(req, res, method, url, segments);
    return error(res, 404, 'Route not found');
  } catch (err) {
    console.error(err);
    return error(res, 500, 'Internal server error');
  }
}

await loadDb();
http.createServer(router).listen(PORT, HOST, () => {
  console.log(`Backend listening on http://${HOST}:${PORT}`);
  console.log('Seed users: admin@example.com, inspector@example.com, auditor@example.com, shipper@example.com / password123');
});
