import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

// Prefer a single DATABASE_URL (Supabase/Railway/Render) when present,
// otherwise fall back to discrete PG* connection params.
const config = env.databaseUrl
  ? { connectionString: env.databaseUrl, ssl: env.pgSsl ? { rejectUnauthorized: false } : false }
  : { ...env.pg, ssl: env.pgSsl ? { rejectUnauthorized: false } : false };

// On Vercel (serverless) each instance must hold only a tiny pool, or many
// concurrent instances will exhaust Supabase's connection limit. Pair this with
// the Supabase *transaction* pooler (port 6543) in production for best results.
const isServerless = !!process.env.VERCEL;

export const pool = new Pool({
  ...config,
  max: isServerless ? 1 : 20,
  idleTimeoutMillis: isServerless ? 10000 : 30000,
  connectionTimeoutMillis: 8000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected idle client error', err);
});

/** Thin query helper. Always use parameterised queries ($1,$2,…) — never string-concat user input. */
export const query = (text, params) => pool.query(text, params);

/** Run a function inside a transaction; auto BEGIN/COMMIT/ROLLBACK. */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
