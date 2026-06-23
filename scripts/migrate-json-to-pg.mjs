// scripts/migrate-json-to-pg.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Import after dotenv so DATABASE_URL is set
import { getPool } from '../backend/db.mjs';

const DB_JSON_PATH = path.resolve(__dirname, '..', 'backend', 'data', 'db.json');

async function migrate() {
  const pool = getPool();
  
  let sourceText;
  try {
    sourceText = await readFile(DB_JSON_PATH, 'utf8');
  } catch (err) {
    console.error(`Could not read ${DB_JSON_PATH}: ${err.message}`);
    process.exit(1);
  }
  
  const source = JSON.parse(sourceText);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Users
    const users = source.users || [];
    console.log(`Migrating ${users.length} users…`);
    for (const u of users) {
      await client.query(
        `INSERT INTO users
          (id, email, name, full_name, role, password_hash, reset_token,
           verified, is_verified, created_date, updated_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [
          u.id, u.email, u.name || '', u.full_name || u.name || '',
          u.role || 'inspector', u.password_hash, u.reset_token ?? null,
          Boolean(u.verified), Boolean(u.is_verified ?? u.verified),
          u.created_date || new Date().toISOString(),
          u.updated_date || new Date().toISOString(),
        ]
      );
    }

    // 2. Inspection sessions
    const sessions = source.inspection_sessions || [];
    console.log(`Migrating ${sessions.length} inspection sessions…`);
    for (const s of sessions) {
      await client.query(
        `INSERT INTO inspection_sessions
          (id, container_id, shipper_name, inspection_type, location_name,
           latitude, longitude, status, notes, verified_by_name, verified_at,
           admin_comment, inspector_name, photo_count, ocr_serial, archived,
           created_by_id, created_date, updated_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         ON CONFLICT (id) DO NOTHING`,
        [
          s.id, s.container_id, s.shipper_name || '', s.inspection_type,
          s.location_name, s.latitude ?? null, s.longitude ?? null,
          s.status || 'draft', s.notes || '', s.verified_by_name || '',
          s.verified_at ?? null, s.admin_comment || '', s.inspector_name || '',
          s.photo_count || 0, s.ocr_serial || '', Boolean(s.archived),
          s.created_by_id ?? null,
          s.created_date || new Date().toISOString(),
          s.updated_date || new Date().toISOString(),
        ]
      );
    }

    // 3. Inspection photos
    const photos = source.inspection_photos || [];
    console.log(`Migrating ${photos.length} inspection photos…`);
    for (const p of photos) {
      await client.query(
        `INSERT INTO inspection_photos
          (id, session_id, photo_url, photo_angle, file_size_kb, resolution,
           device_info, ocr_detected_serial, ocr_confirmed_serial, ocr_confidence,
           ocr_processed, is_corrected, damage_labels, created_by_id,
           created_date, updated_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING`,
        [
          p.id, p.session_id, p.photo_url, p.photo_angle,
          p.file_size_kb || 0, p.resolution || '', p.device_info || '',
          p.ocr_detected_serial || '', p.ocr_confirmed_serial || '',
          p.ocr_confidence || 0, Boolean(p.ocr_processed), Boolean(p.is_corrected),
          JSON.stringify(Array.isArray(p.damage_labels) ? p.damage_labels : []),
          p.created_by_id ?? null,
          p.created_date || new Date().toISOString(),
          p.updated_date || new Date().toISOString(),
        ]
      );
    }

    // 4. Audit logs
    const logs = source.audit_logs || [];
    console.log(`Migrating ${logs.length} audit logs…`);
    for (const l of logs) {
      await client.query(
        `INSERT INTO audit_logs
          (id, action, entity_type, entity_id, user_name, details,
           created_by_id, created_at, created_date, updated_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [
          l.id, l.action, l.entity_type, l.entity_id || '',
          l.user_name || '', l.details || '', l.created_by_id ?? null,
          l.created_at || l.created_date || new Date().toISOString(),
          l.created_date || new Date().toISOString(),
          l.updated_date || new Date().toISOString(),
        ]
      );
    }

    // 5. Active tokens (sessions)
    const tokens = Object.entries(source.tokens || {});
    console.log(`Migrating ${tokens.length} active tokens…`);
    for (const [token, userId] of tokens) {
      // Only migrate if the user exists in DB
      const exists = await client.query(
        'SELECT id FROM users WHERE id = $1', [userId]
      );
      if (exists.rows.length) {
        await client.query(
          `INSERT INTO sessions (token, user_id) VALUES ($1, $2)
           ON CONFLICT (token) DO NOTHING`,
          [token, userId]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed, rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
