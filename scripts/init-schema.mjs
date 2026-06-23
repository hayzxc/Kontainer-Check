import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { getPool } from '../backend/db.mjs';

async function init() {
  const sqlPath = path.resolve(__dirname, '..', 'backend', 'schema.sql');
  const sql = await readFile(sqlPath, 'utf8');
  const pool = getPool();
  try {
    await pool.query(sql);
    console.log('✅ Schema initialized successfully');
  } catch (err) {
    console.error('❌ Failed to initialize schema:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

init();
