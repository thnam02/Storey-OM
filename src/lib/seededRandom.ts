/**
 * Deterministic random numbers (mulberry32), the same generator the prototype
 * uses. Anything generated for the 3D scene must use this so objects and
 * people stay in the same place between reloads.
 */
export type Random = () => number;

export function createRandom(seed: number): Random {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T,>(rand: Random, items: readonly T[]): T => {
  if (!items.length) throw new Error('pick() needs at least one item');
  return items[Math.floor(rand() * items.length)] as T;
};
