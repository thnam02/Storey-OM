import { PGlite, types } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SEED_PATH } from './seed/generate';
import { stableUuid } from './seed/helpers';

const MIGRATIONS = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));

/**
 * The parts of Supabase the migrations rely on: the auth schema with
 * auth.users and auth.uid() (read from the request's JWT claims, as Supabase
 * does), and the anon and authenticated API roles.
 */
const SUPABASE_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
`;

/** What Supabase grants its API roles by default; row-level security decides the rest. */
const SUPABASE_GRANTS = `
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant execute on all functions in schema public to anon, authenticated;
`;

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
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(MIGRATIONS + file, 'utf8'));
  }
  await db.exec(readFileSync(SEED_PATH, 'utf8'));
  await db.exec(SUPABASE_GRANTS);
  return db;
}

/**
 * For the rest of the current transaction, query as the Supabase API would
 * for an account with this email (null: not signed in). The account is
 * created if needed, confirmed unless `confirmed` is false.
 */
export async function signInAs(db: PGlite, email: string | null, { confirmed = true } = {}): Promise<void> {
  await db.exec('reset role');
  if (email === null) {
    await db.query(`select set_config('request.jwt.claims', '', true)`);
    await db.exec('set local role anon');
    return;
  }
  const id = stableUuid('account', email.toLowerCase());
  await db.query(
    `insert into auth.users (id, email, email_confirmed_at) values ($1, $2, $3)
     on conflict (id) do update set email = excluded.email, email_confirmed_at = excluded.email_confirmed_at`,
    [id, email, confirmed ? '2026-11-01T00:00:00Z' : null],
  );
  await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: id, email, role: 'authenticated' })]);
  await db.exec('set local role authenticated');
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
