/** The task and approval functions: what they change, what they log, and when they refuse. */
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SAMPLE_TEAM } from '../src/data/sampleTeam';
import { buildSeed } from './seed/buildSeed';
import { createSeededDb } from './testDb';

const seed = buildSeed();
const emp = seed.ids.employee;
const openTaskOf = (slug: string) => seed.ids.task(SAMPLE_TEAM.tasks.find((t) => t.assigneeId === slug && t.status !== 'done')!.id);
const doneTaskOf = (slug: string) => seed.ids.task(SAMPLE_TEAM.tasks.find((t) => t.assigneeId === slug && t.status === 'done')!.id);

let db: PGlite;
const one = async <T,>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0]!;
const log = () => db.query<{ action: string; actor_slug: string; title: string; assignee_slug: string | null; from_slug: string | null; to_slug: string | null; created_at: string }>(
  'select * from activity_feed order by id',
).then((r) => r.rows);

beforeAll(async () => {
  db = await createSeededDb();
}, 60_000);
afterAll(async () => {
  await db?.close();
});
// Each test runs in a transaction that is rolled back.
beforeEach(async () => {
  await db.exec('begin');
  return () => db.exec('rollback');
});

describe('assign_task', () => {
  it('adds a to-do task created by the viewer and logs it', async () => {
    const t = await one<{ title: string; status: string; created_by: string; due_date: string }>(
      `select * from assign_task($1, '  Call Lotus Grocers  ', '2026-11-18')`, [emp('huong-le')],
    );
    expect(t).toMatchObject({ title: 'Call Lotus Grocers', status: 'todo', created_by: emp('michael-chen'), due_date: '2026-11-18' });
    expect(await log()).toMatchObject([{ action: 'assign', actor_slug: 'michael-chen', title: 'Call Lotus Grocers', assignee_slug: 'huong-le' }]);
  });

  it('can link the new task to a record', async () => {
    const inv = await one<{ id: string }>(`select id from invoices where number = 'INV-2041'`);
    const t = await one<{ id: string }>(`select * from assign_task($1, 'Call about INV-2041', '2026-11-18', 'invoice', $2)`, [emp('hannah-brooks'), inv.id]);
    expect(await one(`select linked_label from task_list where id = $1`, [t.id])).toEqual({ linked_label: 'INV-2041' });
  });

  it('refuses a blank title', async () => {
    await expect(db.query(`select assign_task($1, '   ', '2026-11-18')`, [emp('huong-le')])).rejects.toThrow();
  });
});

describe('delegate_task', () => {
  it('moves an open task within the department, restarts it and logs from and to', async () => {
    const t = await one<{ assignee_id: string; delegated_from_id: string; status: string }>(
      'select * from delegate_task($1, $2)', [openTaskOf('hannah-brooks'), emp('lan-phan')],
    );
    expect(t).toEqual(expect.objectContaining({ assignee_id: emp('lan-phan'), delegated_from_id: emp('hannah-brooks'), status: 'todo' }));
    expect(await log()).toMatchObject([{ action: 'delegate', assignee_slug: 'lan-phan', from_slug: 'hannah-brooks', to_slug: 'lan-phan' }]);
  });

  it('refuses another department, done tasks and the same person', async () => {
    const tries = [
      ['select delegate_task($1, $2)', [openTaskOf('hannah-brooks'), emp('linh-nguyen')], /within a department/],
      ['select delegate_task($1, $2)', [doneTaskOf('hannah-brooks'), emp('lan-phan')], /Only open tasks/],
      ['select delegate_task($1, $2)', [openTaskOf('hannah-brooks'), emp('hannah-brooks')], /already with/],
    ] as const;
    for (const [sql, params, msg] of tries) {
      await db.exec('savepoint s');
      await expect(db.query(sql, [...params])).rejects.toThrow(msg);
      await db.exec('rollback to savepoint s');
    }
    expect(await log()).toEqual([]);
  });
});

describe('complete_task and reopen_task', () => {
  it('marks done on the app day, counts as done this week, and reopens', async () => {
    const id = openTaskOf('huong-le');
    const before = await one<{ open: number; done_this_week: number }>('select open, done_this_week from employee_workload where employee_id = $1', [emp('huong-le')]);

    const done = await one<{ status: string; done_at: string }>('select * from complete_task($1)', [id]);
    expect(done.status).toBe('done');
    expect(await one(`select (done_at at time zone app_timezone())::date::text d from tasks where id = $1`, [id])).toEqual({ d: '2026-11-17' });
    expect(await one('select open, done_this_week from employee_workload where employee_id = $1', [emp('huong-le')])).toEqual({
      open: before.open - 1, done_this_week: before.done_this_week + 1,
    });

    // Completing twice changes nothing and logs once.
    await db.query('select complete_task($1)', [id]);
    const reopened = await one<{ status: string; done_at: string | null }>('select * from reopen_task($1)', [id]);
    expect(reopened).toMatchObject({ status: 'todo', done_at: null });
    expect((await log()).map((l) => l.action)).toEqual(['complete', 'reopen']);
  });
});

describe('decide_approval', () => {
  it('approves, then undoes, recording who and when', async () => {
    const a1 = await one<{ id: string }>(`select id from approvals order by created_at limit 1`);
    const approved = await one<{ state: string; decided_by: string; decided_at: string | null }>(`select * from decide_approval($1, 'approved')`, [a1.id]);
    expect(approved.state).toBe('approved');
    expect(approved.decided_by).toBe(emp('michael-chen'));
    expect(approved.decided_at).not.toBeNull();
    const undone = await one<{ state: string; decided_by: string | null }>(`select * from decide_approval($1, 'waiting')`, [a1.id]);
    expect(undone).toMatchObject({ state: 'waiting', decided_by: null });
    expect((await log()).map((l) => l.action)).toEqual(['approve', 'undo_decision']);
  });
});

describe('outside sample mode', () => {
  it('refuses every change until sign-in exists', async () => {
    await db.query(`update app_settings set value = 'live' where key = 'dataset'`);
    expect(await one('select current_actor() a')).toEqual({ a: null });
    await expect(db.query('select complete_task($1)', [openTaskOf('huong-le')])).rejects.toThrow(/Sign in/);
  });

  it('hides every row from API roles outside sample mode and blocks direct writes', async () => {
    await db.exec(`create role app_reader; grant select, insert, update, delete on all tables in schema public to app_reader;`);
    await db.exec('set role app_reader');
    const visible = async () => Number((await one<{ n: string }>('select count(*)::text n from tasks')).n);
    expect(await visible()).toBe(SAMPLE_TEAM.tasks.length);
    expect(await one<{ n: string }>('select count(*)::text n from task_list')).toEqual({ n: String(SAMPLE_TEAM.tasks.length) });
    await db.exec('reset role');
    await db.query(`update app_settings set value = 'live' where key = 'dataset'`);
    await db.exec('set role app_reader');
    expect(await visible()).toBe(0);
    await db.exec('savepoint s');
    // No write policies: updates match no rows; inserts are refused.
    await db.query(`update tasks set title = 'x'`);
    await expect(db.query(`insert into customers (name) values ('x')`)).rejects.toThrow(/row-level security/);
    await db.exec('rollback to savepoint s');
    await db.exec('reset role');
    expect(Number((await one<{ n: string }>(`select count(*)::text n from tasks where title = 'x'`)).n)).toBe(0);
  });
});
