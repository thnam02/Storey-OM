/**
 * Reads the seeded database the way the Supabase source does (same relations,
 * order and limits) and checks the mapped snapshot is the sample company the
 * app shows without a database.
 */
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { describeActivity } from '../src/data/activity';
import { SAMPLE_DATA } from '../src/data/sample';
import { SAMPLE_TEAM, SAMPLE_VIEWER_ID } from '../src/data/sampleTeam';
import { RELATIONS, toSnapshot, type DbRows } from '../src/data/source/rows';
import type { Snapshot } from '../src/data/source/types';
import { workloadByEmployee } from '../src/data/workload';
import { createSeededDb } from './testDb';

let db: PGlite;

async function readSnapshot(): Promise<Snapshot> {
  const rows: Record<string, unknown[]> = {};
  for (const [name, spec] of Object.entries(RELATIONS)) {
    const order = spec.order?.length ? ` order by ${spec.order.map(([c, asc]) => `${c} ${asc ? 'asc' : 'desc'} nulls last`).join(', ')}` : '';
    rows[name] = (await db.query(`select * from ${name}${order}${spec.limit ? ` limit ${spec.limit}` : ''}`)).rows;
  }
  return toSnapshot(rows as unknown as DbRows);
}

beforeAll(async () => {
  db = await createSeededDb();
}, 60_000);
afterAll(async () => {
  await db?.close();
});

const byKey = <T,>(items: T[], key: (x: T) => string) => [...items].sort((a, b) => key(a).localeCompare(key(b)));

describe('snapshot from the database', () => {
  it('has the sample settings: today, week, viewer, sample flag', async () => {
    const s = await readSnapshot();
    expect([s.team.today, s.team.weekStart, s.viewerId, s.isSample, s.timezone]).toEqual([
      SAMPLE_TEAM.today, SAMPLE_TEAM.weekStart, SAMPLE_VIEWER_ID, true, 'Australia/Sydney',
    ]);
  });

  it('lists the same people in the same order (so seating stays put)', async () => {
    expect((await readSnapshot()).team.employees).toEqual(SAMPLE_TEAM.employees);
  });

  it('has the same tasks and workload for everyone', async () => {
    const s = await readSnapshot();
    const strip = (t: (typeof s.team.tasks)[number]) => [t.assigneeId, t.title, t.status, t.dueDate, t.doneAt, t.linked?.type ?? null].join('|');
    expect(s.team.tasks.map(strip).sort()).toEqual(SAMPLE_TEAM.tasks.map(strip).sort());
    expect(workloadByEmployee(s.team.employees, s.team.tasks, s.team.today, s.team.weekStart)).toEqual(
      workloadByEmployee(SAMPLE_TEAM.employees, SAMPLE_TEAM.tasks, SAMPLE_TEAM.today, SAMPLE_TEAM.weekStart),
    );
  });

  it('labels linked records readably', async () => {
    const labels = new Set((await readSnapshot()).team.tasks.flatMap((t) => (t.linked ? [t.linked.label] : [])));
    for (const l of ['INV-2041', 'IMP-1185', 'SKU-3105', 'PO-879', 'Deal · Harbourline Retail', 'Spring Sale, Sydney']) expect(labels).toContain(l);
  });

  it('rebuilds every workspace figure the prototype shows', async () => {
    const { company: c } = await readSnapshot();
    const S = SAMPLE_DATA;
    expect(c.sales).toEqual(S.sales);
    expect({ ...c.marketing, campaigns: byKey(c.marketing.campaigns, (x) => x.name) }).toEqual({ ...S.marketing, campaigns: byKey(S.marketing.campaigns, (x) => x.name) });
    expect(c.finance).toEqual(S.finance);
    expect({ ...c.management, approvals: c.management.approvals.map(({ id: _id, ...a }) => a) }).toEqual({
      ...S.management, approvals: S.management.approvals.map(({ id: _id, ...a }) => a),
    });
    expect(byKey(c.importExport.shipments, (x) => x.id)).toEqual(byKey(S.importExport.shipments, (x) => x.id));
    expect(byKey(c.importExport.paperwork, (x) => x.id)).toEqual(byKey(S.importExport.paperwork, (x) => x.id));
    expect(c.warehouse).toEqual(S.warehouse);
  });

  it('shows changes made through the database functions, with the activity log', async () => {
    await db.exec('begin');
    try {
      const before = await readSnapshot();
      const task = before.team.tasks.find((t) => t.assigneeId === 'hannah-brooks' && t.linked?.label === 'INV-2041')!;
      const ids = Object.fromEntries((await db.query<{ slug: string; id: string }>('select slug, id from employees')).rows.map((r) => [r.slug, r.id]));
      await db.query('select delegate_task($1, $2)', [task.id, ids['lan-phan']]);
      await db.query('select complete_task($1)', [task.id]);
      await db.query(`select assign_task($1, 'Call Lotus Grocers', '2026-11-18')`, [ids['hannah-brooks']]);

      const after = await readSnapshot();
      expect(after.team.tasks.find((t) => t.id === task.id)).toMatchObject({ assigneeId: 'lan-phan', delegatedFromId: 'hannah-brooks', status: 'done', doneAt: '2026-11-17' });
      expect(after.team.tasks.find((t) => t.title === 'Call Lotus Grocers')).toMatchObject({ assigneeId: 'hannah-brooks', createdById: SAMPLE_VIEWER_ID, status: 'todo' });

      const names = new Map(after.team.employees.map((e) => [e.id, e.name]));
      const lines = after.activity.map((e) => describeActivity(e, (id) => names.get(id) ?? id, after.viewerId));
      expect(lines).toEqual([
        'You assigned “Call Lotus Grocers” to Hannah Brooks.',
        'You marked “Chase payment from Harbourline Retail” done for Lan Phan.',
        'You delegated “Chase payment from Harbourline Retail” from Hannah Brooks to Lan Phan.',
      ]);
      expect(after.activity.every((e) => e.at.startsWith('2026-11-17T'))).toBe(true);
    } finally {
      await db.exec('rollback');
    }
  });
});
