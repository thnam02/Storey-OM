import { describe, expect, it } from 'vitest';
import { SAMPLE_DATA } from './sample';
import { departmentStatus } from './status';

describe('departmentStatus', () => {
  it('flags finance when invoices are overdue', () => {
    expect(departmentStatus('finance', SAMPLE_DATA)).toEqual({
      tone: 'warn',
      chip: 'Needs attention',
      text: 'A$96K overdue across 3 invoices',
    });
  });

  it('counts waiting approvals for management', () => {
    expect(departmentStatus('management', SAMPLE_DATA).chip).toBe('3 to approve');
  });

  it('is clear for management when nothing is waiting', () => {
    const data = structuredClone(SAMPLE_DATA);
    data.management.approvals.forEach((a) => (a.state = 'approved'));
    expect(departmentStatus('management', data)).toMatchObject({ tone: 'ok', chip: 'All clear' });
  });

  it('names shipments held at customs', () => {
    expect(departmentStatus('import-export', SAMPLE_DATA).text).toBe('IMP-1185 held at customs');
  });

  it('counts products below reorder level', () => {
    expect(departmentStatus('warehouse', SAMPLE_DATA).text).toBe('3 products below reorder level');
  });
});
