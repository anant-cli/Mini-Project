import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// DATABASE_URL works for both a local Postgres install and a managed cloud
// host (Neon, Supabase, Render, Railway). Cloud hosts require SSL; a local
// install almost never has SSL turned on, so forcing SSL for every
// DATABASE_URL breaks local development ("connect ECONNREFUSED" / "server
// does not support SSL connections" on every request, including login).
// We only turn SSL on when the host isn't local, and it can be overridden
// explicitly with PGSSL=true|false.
const databaseUrl = process.env.DATABASE_URL;
const isLocalHost = (url) => {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
};

let useSsl;
if (process.env.PGSSL !== undefined) {
  useSsl = process.env.PGSSL === 'true';
} else {
  useSsl = Boolean(databaseUrl) && !isLocalHost(databaseUrl);
}

export const pool = new Pool(
  databaseUrl
    ? {
        connectionString: databaseUrl,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
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

// Custom enum array columns (vehicle_types_allowed is vehicle_type[]) get a
// dynamically-assigned OID per database, so pg's built-in array parsers
// don't recognize them and return the raw "{car,suv}" literal as a plain
// string instead of a JS array. Look up that OID once at startup and teach
// pg how to parse it, the same way it already knows built-in array types.
const parsePgTextArray = (value) => {
  if (value === null) return null;
  const inner = value.slice(1, -1);
  return inner.length ? inner.split(',') : [];
};

try {
  const { rows } = await pool.query("SELECT oid FROM pg_type WHERE typname = '_vehicle_type'");
  if (rows[0]) {
    pg.types.setTypeParser(rows[0].oid, parsePgTextArray);
  }
} catch (err) {
  console.error('Could not register vehicle_type[] parser (non-fatal):', err.message);
}

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
