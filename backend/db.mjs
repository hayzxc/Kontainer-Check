// backend/db.mjs
import pg from 'pg';

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err.message);
    });
  }
  return pool;
}

// ─── Query helper ────────────────────────────────────────────────────────────

export async function query(sql, params = []) {
  const client = getPool();
  const result = await client.query(sql, params);
  return result.rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function findUserByEmail(email) {
  return queryOne('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
}

export async function findUserById(id) {
  return queryOne('SELECT * FROM users WHERE id = $1', [id]);
}

export async function listUsers() {
  return query('SELECT * FROM users ORDER BY created_date ASC');
}

export async function insertUser(user) {
  return queryOne(
    `INSERT INTO users
      (id, email, name, full_name, role, password_hash,
       verified, is_verified, created_date, updated_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      user.id, user.email, user.name, user.full_name, user.role,
      user.password_hash, user.verified ?? false, user.is_verified ?? false,
      user.created_date, user.updated_date,
    ]
  );
}

export async function updateUser(id, fields) {
  // Only allow safe columns
  const allowed = ['name', 'full_name', 'password_hash', 'reset_token',
                   'verified', 'is_verified', 'updated_date'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (!updates.length) return findUserById(id);

  const setClauses = updates.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values = updates.map(([, v]) => v);
  return queryOne(
    `UPDATE users SET ${setClauses} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
}

export async function findUserByResetToken(token) {
  return queryOne('SELECT * FROM users WHERE reset_token = $1', [token]);
}

// ─── Auth tokens (sessions) ───────────────────────────────────────────────────

export async function findUserByToken(token) {
  return queryOne(
    `SELECT u.* FROM users u
     JOIN sessions s ON s.user_id = u.id
     WHERE s.token = $1 AND (s.expires_at IS NULL OR s.expires_at > NOW())`,
    [token]
  );
}

export async function insertToken(token, userId, expiresAt = null) {
  await query(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
    [token, userId, expiresAt]
  );
}

export async function deleteToken(token) {
  await query('DELETE FROM sessions WHERE token = $1', [token]);
}

// ─── Inspection sessions ──────────────────────────────────────────────────────

export async function listInspectionSessions(filters = {}) {
  const conditions = [];
  const params = [];
  let i = 1;

  if (filters.created_by_id) {
    conditions.push(`created_by_id = $${i++}`);
    params.push(filters.created_by_id);
  }
  if (filters.status) {
    conditions.push(`status = $${i++}`);
    params.push(filters.status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return query(
    `SELECT * FROM inspection_sessions ${where} ORDER BY created_date DESC`,
    params
  );
}

export async function findInspectionSession(id) {
  return queryOne('SELECT * FROM inspection_sessions WHERE id = $1', [id]);
}

export async function insertInspectionSession(session) {
  return queryOne(
    `INSERT INTO inspection_sessions
      (id, container_id, shipper_name, inspection_type, location_name,
       latitude, longitude, status, notes, verified_by_name, verified_at,
       admin_comment, inspector_name, photo_count, ocr_serial, archived,
       created_by_id, created_date, updated_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING *`,
    [
      session.id, session.container_id, session.shipper_name,
      session.inspection_type, session.location_name,
      session.latitude ?? null, session.longitude ?? null,
      session.status, session.notes, session.verified_by_name,
      session.verified_at ?? null, session.admin_comment, session.inspector_name,
      session.photo_count, session.ocr_serial, session.archived,
      session.created_by_id, session.created_date, session.updated_date,
    ]
  );
}

export async function updateInspectionSession(id, fields) {
  const allowed = [
    'container_id', 'shipper_name', 'inspection_type', 'location_name',
    'latitude', 'longitude', 'status', 'notes', 'verified_by_name',
    'verified_at', 'admin_comment', 'inspector_name', 'photo_count',
    'ocr_serial', 'archived', 'updated_date',
  ];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (!updates.length) return findInspectionSession(id);

  const setClauses = updates.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values = updates.map(([, v]) => v);
  return queryOne(
    `UPDATE inspection_sessions SET ${setClauses} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
}

export async function deleteInspectionSession(id) {
  await query('DELETE FROM inspection_sessions WHERE id = $1', [id]);
}

// ─── Inspection photos ────────────────────────────────────────────────────────

export async function listInspectionPhotos(filters = {}) {
  const conditions = [];
  const params = [];
  let i = 1;

  if (filters.session_id) {
    conditions.push(`session_id = $${i++}`);
    params.push(filters.session_id);
  }
  if (filters.created_by_id) {
    conditions.push(`created_by_id = $${i++}`);
    params.push(filters.created_by_id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return query(
    `SELECT * FROM inspection_photos ${where} ORDER BY created_date ASC`,
    params
  );
}

export async function findInspectionPhoto(id) {
  return queryOne('SELECT * FROM inspection_photos WHERE id = $1', [id]);
}

export async function insertInspectionPhoto(photo) {
  return queryOne(
    `INSERT INTO inspection_photos
      (id, session_id, photo_url, photo_angle, file_size_kb, resolution,
       device_info, ocr_detected_serial, ocr_confirmed_serial, ocr_confidence,
       ocr_processed, is_corrected, damage_labels, created_by_id,
       created_date, updated_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [
      photo.id, photo.session_id, photo.photo_url, photo.photo_angle,
      photo.file_size_kb, photo.resolution, photo.device_info,
      photo.ocr_detected_serial, photo.ocr_confirmed_serial, photo.ocr_confidence,
      photo.ocr_processed, photo.is_corrected,
      JSON.stringify(photo.damage_labels ?? []),
      photo.created_by_id, photo.created_date, photo.updated_date,
    ]
  );
}

export async function updateInspectionPhoto(id, fields) {
  const allowed = [
    'photo_url', 'photo_angle', 'file_size_kb', 'resolution', 'device_info',
    'ocr_detected_serial', 'ocr_confirmed_serial', 'ocr_confidence',
    'ocr_processed', 'is_corrected', 'damage_labels', 'updated_date',
  ];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (!updates.length) return findInspectionPhoto(id);

  const setClauses = updates.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const finalValues = updates.map(([k, v]) =>
    k === 'damage_labels' ? JSON.stringify(v) : v
  );

  return queryOne(
    `UPDATE inspection_photos SET ${setClauses} WHERE id = $1 RETURNING *`,
    [id, ...finalValues]
  );
}

export async function deleteInspectionPhoto(id) {
  await query('DELETE FROM inspection_photos WHERE id = $1', [id]);
}

export async function countPhotosBySession(sessionId) {
  const row = await queryOne(
    'SELECT COUNT(*)::int AS count FROM inspection_photos WHERE session_id = $1',
    [sessionId]
  );
  return row?.count ?? 0;
}

// ─── Audit logs ───────────────────────────────────────────────────────────────

export async function listAuditLogs(limit = 500) {
  return query(
    'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
}

export async function insertAuditLog(log) {
  await query(
    `INSERT INTO audit_logs
      (id, action, entity_type, entity_id, user_name, details,
       created_by_id, created_at, created_date, updated_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      log.id, log.action, log.entity_type, log.entity_id,
      log.user_name, log.details, log.created_by_id,
      log.created_at, log.created_date, log.updated_date,
    ]
  );
}

// ─── Seed helper ─────────────────────────────────────────────────────────────

export async function upsertSeedUser(user) {
  await query(
    `INSERT INTO users
      (id, email, name, full_name, role, password_hash, verified, is_verified,
       created_date, updated_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (email) DO NOTHING`,
    [
      user.id, user.email, user.name, user.full_name, user.role,
      user.password_hash, true, true, user.created_date, user.updated_date,
    ]
  );
}
