import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Two ways to configure the connection:
// 1. DATABASE_URL — a single connection string, which is what every free
//    managed Postgres host (Neon, Supabase, Render, Railway) gives you.
//    These all require SSL, so we turn it on automatically whenever
//    DATABASE_URL is set.
// 2. PGHOST/PGPORT/etc — individual vars, for a local Postgres install
//    with no SSL. Used only if DATABASE_URL is absent.
const useConnectionString = Boolean(process.env.DATABASE_URL);

export const pool = new Pool(
  useConnectionString
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
      }
    : {
        host: process.env.PGHOST,
        port: process.env.PGPORT,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        max: 20,
        idleTimeoutMillis: 30000,
      }
);

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
