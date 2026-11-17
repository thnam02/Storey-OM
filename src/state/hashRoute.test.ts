import { describe, expect, it } from 'vitest';
import { parseHash, toHash } from './hashRoute';

const people = [{ id: 'linh-nguyen', departmentId: 'sales' as const }];

describe('hash routes', () => {
  it('opens a department', () => {
    expect(parseHash('#finance', people)).toEqual({ selectedDeptId: 'finance', selectedEmployeeId: null });
  });

  it('opens a person and their department', () => {
    expect(parseHash('#p-linh-nguyen', people)).toEqual({ selectedDeptId: 'sales', selectedEmployeeId: 'linh-nguyen' });
  });

  it('falls back to the overview for anything unknown', () => {
    expect(parseHash('#p-nobody', people)).toEqual({ selectedDeptId: null, selectedEmployeeId: null });
    expect(parseHash('#nope', people)).toEqual({ selectedDeptId: null, selectedEmployeeId: null });
    expect(parseHash('', people)).toEqual({ selectedDeptId: null, selectedEmployeeId: null });
  });

  it('keeps a locked department in the link', () => {
    expect(toHash({ selectedDeptId: null, selectedEmployeeId: null, lockedDeptId: 'finance' })).toBe('finance');
  });

  it('round-trips', () => {
    for (const h of ['sales', 'p-linh-nguyen', 'overview']) {
      expect(toHash(parseHash(`#${h}`, people))).toBe(h);
    }
  });
});
