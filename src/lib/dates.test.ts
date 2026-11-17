import { describe, expect, it } from 'vitest';
import { addDays, dueDateOptions, formatDay, formatLongDay, formatWeekdayDay, monthName, parseDayMonth } from './dates';

describe('dates', () => {
  it('formats days like the prototype', () => {
    expect(formatDay('2026-11-17')).toBe('17 Nov');
    expect(formatDay('2026-12-05')).toBe('5 Dec');
    expect(formatWeekdayDay('2026-11-16')).toBe('Mon 16 Nov');
    expect(formatLongDay('2026-11-17')).toBe('Tuesday 17 Nov');
    expect(monthName('2026-11-17')).toBe('November');
  });

  it('adds days across month ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-11-17', -17)).toBe('2026-10-31');
  });

  it('parses "19 Nov" to the nearest year', () => {
    expect(parseDayMonth('19 Nov', '2026-11-17')).toBe('2026-11-19');
    expect(parseDayMonth('9 Jan', '2026-11-17')).toBe('2027-01-09');
    expect(parseDayMonth('soon', '2026-11-17')).toBeNull();
  });

  it('offers today, tomorrow, Friday and next week (prototype: 17, 18, 20, 24 Nov)', () => {
    expect(dueDateOptions('2026-11-17').map((o) => o.value)).toEqual(['2026-11-17', '2026-11-18', '2026-11-20', '2026-11-24']);
    // On a Thursday, Friday is tomorrow, so it is offered once.
    expect(dueDateOptions('2026-11-19').map((o) => o.label)).toEqual(['Today', 'Tomorrow', 'Next week']);
  });
});
