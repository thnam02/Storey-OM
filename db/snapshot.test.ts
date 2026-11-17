/**
 * Reads the seeded database the way the Supabase source does (same relations,
 * order and limits, signed in as a manager or director) and checks the mapped
 * snapshot is what the app shows that person without a database.
 */
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { scopeSnapshot, viewerOf } from '../src/data/access';
import { describeActivity } from '../src/data/activity';
import { SAMPLE_DATA } from '../src/data/sample';
import { SAMPLE_TEAM, SAMPLE_VIEWER_ID, sampleEmail } from '../src/data/sampleTeam';
import { createSampleSource } from '../src/data/source/sampleSource';
import { RELATIONS, toSnapshot, type DbRows } from '../src/data/source/rows';
import type { Snapshot } from '../src/data/source/types';
import type { CompanyData, Task } from '../src/data/types';
import { workloadByEmployee } from '../src/data/workload';
import { createSeededDb, signInAs } from './testDb';

let db: PGlite;

/** The snapshot the Supabase source would build for this person (the managing director by default). */
let inTransaction = false;
async function readSnapshot(as = SAMPLE_VIEWER_ID): Promise<Snapshot> {
  // Sign-in lasts until the end of the transaction (or savepoint).
  await db.exec(inTransaction ? 'savepoint read' : 'begin');
  try {
    await signInAs(db, sampleEmail(as));
    const rows: Record<string, unknown[]> = {};
    for (const [name, spec] of Object.entries(RELATIONS)) {
      const order = spec.order?.length ? ` order by ${spec.order.map(([c, asc]) => `${c} ${asc ? 'asc' : 'desc'} nulls last`).join(', ')}` : '';
      rows[name] = (await db.query(`select * from ${name}${order}${spec.limit ? ` limit ${spec.limit}` : ''}`)).rows;
    }
    return toSnapshot(rows as unknown as DbRows);
  } finally {
    await db.exec(inTransaction ? 'rollback to savepoint read' : 'rollback');
  }
}

beforeAll(async () => {
  db = await createSeededDb();
}, 60_000);
afterAll(async () => {
  await db?.close();
});

const byKey = <T,>(items: T[], key: (x: T) => string) => [...items].sort((a, b) => key(a).localeCompare(key(b)));

/** Company figures without the differences that don't matter: list order, and approval ids (uuids vs sample ids). */
const comparable = (c: CompanyData) => ({
  ...c,
  marketing: { ...c.marketing, campaigns: byKey(c.marketing.campaigns, (x) => x.name) },
  management: { ...c.management, approvals: c.management.approvals.map(({ id: _id, ...a }) => a) },
  importExport: { shipments: byKey(c.importExport.shipments, (x) => x.id), paperwork: byKey(c.importExport.paperwork, (x) => x.id + x.what) },
});
/** Tasks without ids (uuids vs sample ids) or link ids. */
const taskKeys = (tasks: Task[]) => tasks.map((t) => [t.assigneeId, t.title, t.status, t.dueDate, t.doneAt, t.linked?.type ?? null].join('|')).sort();

const ACCOUNTS = SAMPLE_TEAM.employees.filter((e) => e.access).map((e) => e.id);

describe('snapshot from the database', () => {
  it('has the sample settings: today, week, viewer, sample flag', async () => {
    const s = await readSnapshot();
    expect([s.team.today, s.team.weekStart, s.viewer, s.isSample, s.timezone]).toEqual([
      SAMPLE_TEAM.today, SAMPLE_TEAM.weekStart, { id: SAMPLE_VIEWER_ID, role: 'director', departmentId: 'management' }, true, 'Australia/Sydney',
    ]);
  });

  it('gives everyone what the app shows them without a database', async () => {
    const roles = SAMPLE_TEAM.employees.map((e) => e.access);
    expect([roles.filter((r) => r === 'director').length, roles.filter((r) => r === 'manager').length, roles.filter((r) => r === 'employee').length]).toEqual([3, 5, 56]);
    expect(ACCOUNTS).toHaveLength(64);
    const sample = createSampleSource();
    for (const id of ACCOUNTS) {
      sample.viewAs!(id);
      const [fromDb, inApp] = [await readSnapshot(id), await sample.load()];
      expect(fromDb.viewer, id).toEqual(viewerOf(SAMPLE_TEAM.employees, id));
      expect(fromDb.team.employees, id).toEqual(inApp.team.employees);
      expect(taskKeys(fromDb.team.tasks), id).toEqual(taskKeys(inApp.team.tasks));
      expect(comparable(fromDb.company), id).toEqual(comparable(inApp.company));
    }
    // A manager sees one department's tasks; an employee only their own.
    const whole: Snapshot = { company: SAMPLE_DATA, team: SAMPLE_TEAM, viewer: null, isSample: true, timezone: 'Australia/Sydney', activity: [] };
    const tasksFor = (id: string) => scopeSnapshot({ ...whole, viewer: viewerOf(SAMPLE_TEAM.employees, id) }).team.tasks;
    expect(tasksFor('rachel-tan').length).toBeLessThan(SAMPLE_TEAM.tasks.length);
    expect(new Set(tasksFor('rachel-tan').map((t) => SAMPLE_TEAM.employees.find((e) => e.id === t.assigneeId)!.departmentId))).toEqual(new Set(['finance']));
    expect(new Set(tasksFor('huong-le').map((t) => t.assigneeId))).toEqual(new Set(['huong-le']));
  }, 60_000);

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

  it('rebuilds every workspace figure the prototype shows (for a director)', async () => {
    expect(comparable((await readSnapshot()).company)).toEqual(comparable(SAMPLE_DATA));
  });

  it('shows changes made through the database functions, with the activity log', async () => {
    await db.exec('begin');
    inTransaction = true;
    try {
      await signInAs(db, sampleEmail(SAMPLE_VIEWER_ID));
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
      const lines = after.activity.map((e) => describeActivity(e, (id) => names.get(id) ?? id, after.viewer?.id ?? null));
      expect(lines).toEqual([
        'You assigned “Call Lotus Grocers” to Hannah Brooks.',
        'You marked “Chase payment from Harbourline Retail” done for Lan Phan.',
        'You delegated “Chase payment from Harbourline Retail” from Hannah Brooks to Lan Phan.',
      ]);
      expect(after.activity.every((e) => e.at.startsWith('2026-11-17T'))).toBe(true);
    } finally {
      inTransaction = false;
      await db.exec('rollback');
    }
  });
});
