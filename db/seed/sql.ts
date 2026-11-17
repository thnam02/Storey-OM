/** A value as written into the seed: strings are quoted, everything else literal. */
export type SqlValue = string | number | boolean | null;

export type Row = Record<string, SqlValue>;

export interface TableRows {
  table: string;
  rows: Row[];
}

export function sqlLiteral(v: SqlValue): string {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`Cannot write ${v} to SQL`);
    return String(v);
  }
  return `'${v.replaceAll("'", "''")}'`;
}

const BATCH = 100;

/** INSERT statements for each table, in the order given, in batches. */
export function toSql(tables: TableRows[], header: string): string {
  const out = [header.trimEnd(), ''];
  for (const { table, rows } of tables) {
    if (!rows.length) continue;
    const cols = Object.keys(rows[0]!);
    out.push(`-- ${table}: ${rows.length} row${rows.length === 1 ? '' : 's'}`);
    for (let i = 0; i < rows.length; i += BATCH) {
      const values = rows.slice(i, i + BATCH).map((r) => {
        const keys = Object.keys(r);
        if (keys.length !== cols.length || keys.some((k, j) => k !== cols[j])) throw new Error(`Row in ${table} has different columns`);
        return `  (${cols.map((c) => sqlLiteral(r[c]!)).join(', ')})`;
      });
      out.push(`insert into ${table} (${cols.join(', ')}) values\n${values.join(',\n')};`);
    }
    out.push('');
  }
  return out.join('\n');
}
