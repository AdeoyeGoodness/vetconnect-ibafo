// Applies schema.sql to the configured database. Idempotent (uses IF NOT EXISTS).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  console.log('[migrate] Applying schema.sql …');
  await pool.query(sql);
  console.log('[migrate] ✅ Schema applied successfully.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('[migrate] ❌ Failed:', err.message);
  process.exit(1);
});
