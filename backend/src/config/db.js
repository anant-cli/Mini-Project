import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
});

// Convenience helper — every model uses this instead of touching the pool directly.
export const query = (text, params) => pool.query(text, params);

// For operations that must run inside a transaction (e.g. booking creation,
// which locks a slot row to prevent double-booking).
export const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error', err);
});
