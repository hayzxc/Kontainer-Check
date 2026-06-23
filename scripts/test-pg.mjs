import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:memangbeda12@[2406:da18:e5c:b701:5a55:1a9:109d:d7e4]:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Success:', res.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}
test();
