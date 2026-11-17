import { describe, expect, it } from 'vitest';
import { createRandom } from '../../src/lib/seededRandom';
import { monthStart, splitTotal, stableUuid } from './helpers';
import { sqlLiteral, toSql } from './sql';

describe('stableUuid', () => {
  it('is a valid, repeatable v5-style uuid', () => {
    const a = stableUuid('employee', 'linh-nguyen');
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(stableUuid('employee', 'linh-nguyen')).toBe(a);
    expect(stableUuid('customer', 'linh-nguyen')).not.toBe(a);
  });
});

describe('splitTotal', () => {
  it('adds up exactly and respects the bounds', () => {
    for (const [total, n, max] of [[452000, 10, 57500], [420000, 18, 57500], [296700, 30, 12000]] as const) {
      const step = total % 500 ? 100 : 500;
      const parts = splitTotal(total, n, createRandom(n), { max, step });
      expect(parts).toHaveLength(n);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      expect(parts.every((p) => p >= step && p <= max && p % step === 0)).toBe(true);
    }
  });

  it('refuses totals that cannot fit', () => {
    expect(() => splitTotal(100000, 2, createRandom(1), { max: 40000 })).toThrow();
    expect(() => splitTotal(1250, 2, createRandom(1), { max: 40000 })).toThrow();
    expect(splitTotal(0, 0, createRandom(1), { max: 1 })).toEqual([]);
  });
});

describe('sql output', () => {
  it('escapes quotes and writes literals', () => {
    expect(sqlLiteral("Sam O'Brien")).toBe("'Sam O''Brien'");
    expect([sqlLiteral(null), sqlLiteral(true), sqlLiteral(12.5)]).toEqual(['null', 'true', '12.5']);
  });

  it('writes one insert per table', () => {
    expect(toSql([{ table: 't', rows: [{ a: 1, b: 'x' }, { a: 2, b: null }] }], '-- h')).toBe("-- h\n\n-- t: 2 rows\ninsert into t (a, b) values\n  (1, 'x'),\n  (2, null);\n");
  });

  it('gives the first day of nearby months', () => {
    expect(monthStart('2026-11-17')).toBe('2026-11-01');
    expect(monthStart('2026-11-17', -11)).toBe('2025-12-01');
  });
});
