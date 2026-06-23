import { getPool } from '../backend/db.mjs';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function alter() {
  const pool = getPool();
  try {
    await pool.query('ALTER TABLE sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ');
    console.log('✅ Altered sessions table successfully');
  } catch (err) {
    console.error('❌ Failed to alter table:', err.message);
  } finally {
    await pool.end();
  }
}
alter();
