import { describe, expect, it } from 'vitest';
import { nowOnDay, parseMoment, wallTime, zonedParts } from './zonedTime';

describe('zoned time', () => {
  it('reads API and Postgres timestamp formats', () => {
    const want = Date.UTC(2026, 10, 16, 23, 30);
    expect(parseMoment('2026-11-16T23:30:00+00:00').getTime()).toBe(want);
    expect(parseMoment('2026-11-16 23:30:00+00').getTime()).toBe(want);
    expect(parseMoment('2026-11-17 10:30:00+11').getTime()).toBe(want);
    expect(parseMoment('2026-11-16T23:30:00.123456+0000').getTime()).toBe(want + 123);
  });

  it('gives Sydney wall time (daylight time in November)', () => {
    expect(zonedParts('2026-11-16 23:30:00+00', 'Australia/Sydney')).toEqual({ date: '2026-11-17', time: '10:30' });
    expect(wallTime('2026-11-16T23:30:00Z', 'Asia/Ho_Chi_Minh')).toBe('2026-11-17T06:30');
  });

  it('puts the current time of day on the app day', () => {
    expect(nowOnDay('2026-11-17', 'Australia/Sydney', new Date(Date.UTC(2030, 0, 5, 3, 7)))).toBe('2026-11-17T14:07');
  });

  it('refuses nonsense', () => {
    expect(() => zonedParts('soon', 'UTC')).toThrow(/Not a time/);
  });
});
