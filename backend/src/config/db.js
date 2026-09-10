import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

const explainAndExit = (message) => {
  console.error(`\nDatabase configuration error: ${message}\n`);
  console.error('Check backend/.env — see backend/.env.example for the expected format.');
  console.error('Common causes: the file is literally named ".env.txt" instead of ".env"');
  console.error('(Windows hides known extensions by default — check with `dir /a` in a');
  console.error('terminal), the value has quotes around it, or you copied the connection');
  console.error('string from Neon before clicking "Show password".\n');
  process.exit(1);
};

if (!databaseUrl && !process.env.PGHOST) {
  explainAndExit('No DATABASE_URL (or PGHOST/PGUSER/PGPASSWORD) is set, so there is nothing to connect to.');
}
if (databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    if (!parsed.password) {
      explainAndExit('DATABASE_URL is set but has no password in it.');
    }
  } catch {
    explainAndExit('DATABASE_URL is set but is not a valid URL — check for typos or stray characters.');
  }
}

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

export const query = (text, params) => pool.query(text, params);

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
