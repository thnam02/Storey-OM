import { describe, expect, it } from 'vitest';
import { SAMPLE_EMPLOYEES, SAMPLE_TASKS, SAMPLE_TODAY, SAMPLE_WEEK_START, parseLinked, sampleDay } from './sampleTeam';
import type { Task } from './types';
import { shortName, workloadByEmployee, workloadOf } from './workload';

const task = (over: Partial<Task>): Task => ({
  id: 't', title: 'x', status: 'todo', dueDate: '2026-11-20', doneAt: null,
  assigneeId: 'a', createdById: null, delegatedFromId: null, linked: null, ...over,
});

describe('workloadOf', () => {
  const today = '2026-11-17', week = '2026-11-16';

  it('is late when anything open is past due', () => {
    expect(workloadOf([task({ dueDate: '2026-11-16' })], today, week).state).toBe('late');
  });

  it('does not count a task due today as overdue', () => {
    expect(workloadOf([task({ dueDate: today })], today, week)).toMatchObject({ late: 0, state: 'ok' });
  });

  it('ignores done tasks for overdue, but counts them for this week', () => {
    const w = workloadOf([task({ status: 'done', dueDate: '2026-11-10', doneAt: '2026-11-16' })], today, week);
    expect(w).toMatchObject({ open: 0, late: 0, doneThisWeek: 1, state: 'ok' });
  });

  it('is busy at 6 open tasks and on track at 5', () => {
    const five = Array.from({ length: 5 }, (_, i) => task({ id: `t${i}` }));
    expect(workloadOf(five, today, week).state).toBe('ok');
    expect(workloadOf([...five, task({ id: 't5' })], today, week).state).toBe('busy');
  });

  it('prefers late over busy', () => {
    const tasks = [...Array.from({ length: 6 }, (_, i) => task({ id: `t${i}` })), task({ dueDate: '2026-11-01' })];
    expect(workloadOf(tasks, today, week).state).toBe('late');
  });
});

describe('sample team', () => {
  const load = workloadByEmployee(SAMPLE_EMPLOYEES, SAMPLE_TASKS, SAMPLE_TODAY, SAMPLE_WEEK_START);
  const total = (f: (w: { open: number; late: number }) => number, dept?: string) =>
    SAMPLE_EMPLOYEES.filter((e) => !dept || e.departmentId === dept).reduce((s, e) => s + f(load.get(e.id)!), 0);

  it('has the same 64 people as the prototype', () => {
    expect(SAMPLE_EMPLOYEES).toHaveLength(64);
    expect(new Set(SAMPLE_EMPLOYEES.map((e) => e.id)).size).toBe(64);
  });

  it('reproduces the prototype totals (186 open, 19 overdue)', () => {
    expect(total((w) => w.open)).toBe(186);
    expect(total((w) => w.late)).toBe(19);
  });

  it('reproduces the prototype overdue count per department', () => {
    expect({
      'import-export': total((w) => w.late, 'import-export'),
      sales: total((w) => w.late, 'sales'),
      marketing: total((w) => w.late, 'marketing'),
      finance: total((w) => w.late, 'finance'),
      management: total((w) => w.late, 'management'),
      warehouse: total((w) => w.late, 'warehouse'),
    }).toEqual({ 'import-export': 1, sales: 7, marketing: 2, finance: 2, management: 2, warehouse: 5 });
  });

  it('puts one forklift driver on the warehouse floor and 15 people off shift', () => {
    expect(SAMPLE_EMPLOYEES.filter((e) => e.activity === 'forklift').map((e) => e.name)).toEqual(['Dave Murphy']);
    expect(SAMPLE_EMPLOYEES.filter((e) => e.presence === 'off_shift')).toHaveLength(15);
  });

  it('links tasks to CRM records', () => {
    const linked = SAMPLE_TASKS.filter((t) => t.linked);
    expect(linked.length).toBeGreaterThan(40);
    expect(SAMPLE_TASKS.find((t) => t.title === 'Chase payment from Harbourline Retail')?.linked).toEqual({ type: 'invoice', id: 'INV-2041', label: 'INV-2041' });
  });
});

describe('helpers', () => {
  it('converts prototype day numbers to dates', () => {
    expect(sampleDay(17)).toBe('2026-11-17');
    expect(sampleDay(30)).toBe('2026-11-30');
    expect(sampleDay(35)).toBe('2026-12-05');
  });

  it('parses record references', () => {
    expect(parseLinked('Deal · Sapa Coffee')).toEqual({ type: 'deal', id: 'sapa-coffee', label: 'Deal · Sapa Coffee' });
    expect(parseLinked('Approval a1')).toMatchObject({ type: 'approval', id: 'a1' });
    expect(parseLinked('EXP-0736')).toMatchObject({ type: 'shipment', id: 'EXP-0736' });
    expect(parseLinked('Spring Sale')).toMatchObject({ type: 'campaign' });
    expect(parseLinked(null)).toBeNull();
  });

  it('shortens names for tags', () => {
    expect(shortName('Linh Nguyen')).toBe('Linh N.');
    expect(shortName("Sam O'Brien")).toBe('Sam O.');
    expect(shortName('Cher')).toBe('Cher');
  });
});
