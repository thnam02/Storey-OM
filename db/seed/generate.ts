/** Writes supabase/seed.sql from the sample data. Run with `npm run db:seed`. */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSeed, SEED_HEADER } from './buildSeed';
import { toSql } from './sql';

export const SEED_PATH = fileURLToPath(new URL('../../supabase/seed.sql', import.meta.url));

export const renderSeed = () => toSql(buildSeed().tables, SEED_HEADER);

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const sql = renderSeed();
  writeFileSync(SEED_PATH, sql);
  console.log(`Wrote ${SEED_PATH} (${sql.split('\n').length} lines)`);
}
