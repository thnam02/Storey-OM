import { createHash } from 'node:crypto';
import type { Random } from '../../src/lib/seededRandom';

/**
 * Deterministic UUID (version 5 layout) for a seeded record, so reseeding
 * gives every row the same id and links keep pointing at the same records.
 */
export function stableUuid(kind: string, key: string): string {
  const h = createHash('sha1').update(`storey:${kind}:${key}`).digest();
  h[6] = (h[6]! & 0x0f) | 0x50;
  h[8] = (h[8]! & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

/**
 * Split `total` into `n` amounts in multiples of `step`, each between `step`
 * and `max`, spread unevenly but deterministically by `rand`.
 */
export function splitTotal(total: number, n: number, rand: Random, { max, step = 500 }: { max: number; step?: number }): number[] {
  if (n === 0) {
    if (total !== 0) throw new Error(`Cannot split ${total} into no parts`);
    return [];
  }
  const cap = Math.floor(max / step) * step;
  if (total % step !== 0) throw new Error(`${total} is not a multiple of ${step}`);
  if (total < n * step || total > n * cap) throw new Error(`Cannot split ${total} into ${n} parts of ${step}..${cap}`);

  const weights = Array.from({ length: n }, () => 0.6 + rand() * 0.8);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const values = weights.map((w) => Math.min(cap, Math.max(step, Math.round((total * w) / weightSum / step) * step)));

  // Nudge in whole steps until the parts add up exactly.
  let diff = total - values.reduce((a, b) => a + b, 0);
  for (let i = 0; diff !== 0; i++) {
    const k = i % n;
    if (diff > 0 && values[k]! + step <= cap) {
      values[k]! += step;
      diff -= step;
    } else if (diff < 0 && values[k]! - step >= step) {
      values[k]! -= step;
      diff += step;
    }
  }
  return values;
}

/** Timestamp at a local time on a sample day. Sydney is on daylight time (UTC+11) in November. */
export const sydneyTime = (isoDate: string, hhmm: string) => `${isoDate} ${hhmm}:00+11`;

/** First day of the month `offset` months from the month of `isoDate`. */
export function monthStart(isoDate: string, offset = 0): string {
  const [y, m] = isoDate.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  return d.toISOString().slice(0, 10);
}
