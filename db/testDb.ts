import { PGlite, types } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SEED_PATH } from './seed/generate';

const MIGRATIONS = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));

/**
 * A fresh PGlite database with every migration and the seed applied. Dates,
 * timestamps and numbers come back as text, the way the Supabase API sends
 * them as JSON, so mapping code sees the same values in tests.
 */
export async function createSeededDb(): Promise<PGlite> {
  const asText = (v: string) => v;
  const db = new PGlite({
    parsers: { [types.DATE]: asText, [types.TIMESTAMPTZ]: asText, [types.TIMESTAMP]: asText, [types.NUMERIC]: asText },
  });
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(MIGRATIONS + file, 'utf8'));
  }
  await db.exec(readFileSync(SEED_PATH, 'utf8'));
  return db;
}

/** Run a statement inside a transaction that is always rolled back; resolves to the error, if any. */
export async function attempt(db: PGlite, sql: string, params: unknown[] = []): Promise<Error | null> {
  await db.exec('begin');
  try {
    await db.query(sql, params);
    return null;
  } catch (e) {
    return e as Error;
  } finally {
    await db.exec('rollback');
  }
}
