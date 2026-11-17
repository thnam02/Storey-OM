import { describe, expect, it } from 'vitest';
import { createRandom, pick } from './seededRandom';

describe('createRandom', () => {
  it('returns the same sequence for the same seed', () => {
    const a = createRandom(20261117);
    const b = createRandom(20261117);
    const seqA = Array.from({ length: 50 }, a);
    const seqB = Array.from({ length: 50 }, b);
    expect(seqA).toEqual(seqB);
  });

  it('matches the prototype generator', () => {
    // First values of the prototype's r3() with seed 20261117 (prototype/index.html, build3D).
    // If these change, every generated layout moves.
    const r = createRandom(20261117);
    expect([r(), r(), r()]).toEqual([0.876015507383272, 0.0866415249183774, 0.9978529647924006]);
  });

  it('stays within [0, 1)', () => {
    const r = createRandom(1);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('gives different sequences for different seeds', () => {
    expect(createRandom(1)()).not.toEqual(createRandom(2)());
  });
});

describe('pick', () => {
  it('is deterministic for a seed', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(pick(createRandom(7), items)).toBe(pick(createRandom(7), items));
  });
});
