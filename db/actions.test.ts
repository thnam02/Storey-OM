/**
 * The task and approval functions: what they change, what they log, and when
 * they refuse. Each test signs in as the managing director (who can do
 * everything) unless it says otherwise.
 */
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SAMPLE_TEAM, sampleEmail } from '../src/data/sampleTeam';
import { buildSeed } from './seed/buildSeed';
import { createSeededDb, signInAs } from './testDb';

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
  await signInAs(db, sampleEmail('michael-chen'));
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

describe('sign-in and roles', () => {
  const expectRefused = async (sql: string, params: unknown[], msg: RegExp) => {
    await db.exec('savepoint s');
    await expect(db.query(sql, params)).rejects.toThrow(msg);
    await db.exec('rollback to savepoint s');
  };
  const count = async (rel: string) => Number((await one<{ n: string }>(`select count(*)::text n from ${rel}`)).n);

  it('shows nothing and allows nothing without a signed-in person who has access', async () => {
    // Everyone in the sample has access; take it away from one person.
    await db.exec('reset role');
    await db.query(`update employees set access = null where slug = 'quang-vo'`);
    const nobody = [
      () => signInAs(db, null),
      () => signInAs(db, sampleEmail('rachel-tan'), { confirmed: false }),
      () => signInAs(db, sampleEmail('quang-vo')),
      () => signInAs(db, 'someone@elsewhere.example'),
    ];
    for (const signIn of nobody) {
      await signIn();
      for (const rel of ['employees', 'tasks', 'task_list', 'deals', 'invoices', 'app_settings', 'activity_feed', 'me']) expect(await count(rel)).toBe(0);
      await expectRefused('select complete_task($1)', [openTaskOf('huong-le')], /Sign in/);
    }
  });

  it('matches the account to its employee by confirmed email, in any case', async () => {
    await signInAs(db, 'Rachel.Tan@Storey.example');
    expect(await one('select * from me')).toEqual({ slug: 'rachel-tan', access: 'manager', department_id: 'finance' });
  });

  it("lets a manager read only their department's tasks and records", async () => {
    await signInAs(db, sampleEmail('rachel-tan'));
    const depts = (await db.query<{ d: string }>('select distinct e.department_id d from tasks t join employees e on e.id = t.assignee_id')).rows;
    expect(depts).toEqual([{ d: 'finance' }]);
    expect(await count('employees')).toBe(SAMPLE_TEAM.employees.length);
    expect(await count('invoices')).toBeGreaterThan(0);
    for (const rel of ['deals', 'campaigns', 'shipments', 'products']) expect(await count(rel)).toBe(0);
    // A Finance task about a shipment still shows the shipment's code.
    expect(await one(`select linked_label from task_list where title = 'Pay sea freight for IMP-1182'`)).toEqual({ linked_label: 'IMP-1182' });
  });

  it('shares shipments and stock between Import & Export and the Warehouse', async () => {
    for (const slug of ['tuan-ho', 'steve-collins']) {
      await signInAs(db, sampleEmail(slug));
      for (const rel of ['shipments', 'products', 'warehouse_zones', 'stock_movements']) expect(await count(rel)).toBeGreaterThan(0);
      expect(await count('invoices')).toBe(0);
    }
  });

  it("lets a manager act on their own department's tasks only", async () => {
    await signInAs(db, sampleEmail('rachel-tan'));
    await db.query('select complete_task($1)', [openTaskOf('hannah-brooks')]);
    await db.query('select delegate_task($1, $2)', [openTaskOf('lan-phan'), emp('duc-nguyen')]);
    await db.query(`select assign_task($1, 'Check the GST figures', '2026-11-19')`, [emp('trang-vu')]);
    await expectRefused('select complete_task($1)', [openTaskOf('huong-le')], /your own department/);
    await expectRefused(`select assign_task($1, 'x', '2026-11-19')`, [emp('huong-le')], /your own department/);
    await expectRefused('select delegate_task($1, $2)', [openTaskOf('huong-le'), emp('minh-tran')], /your own department/);
    expect((await log()).map((l) => `${l.action} ${l.actor_slug}`)).toEqual(['complete rachel-tan', 'delegate rachel-tan', 'assign rachel-tan']);
  });

  it('lets only directors decide approvals; requesters see their own requests', async () => {
    const id = (await one<{ id: string }>(`select id from approvals where requested_by_department = 'marketing'`)).id;
    await signInAs(db, sampleEmail('emma-lawson'));
    expect((await db.query<{ requested_by_department: string }>('select requested_by_department from approvals')).rows.every((a) => a.requested_by_department === 'marketing')).toBe(true);
    await expectRefused(`select decide_approval($1, 'approved')`, [id], /Only directors/);
    await signInAs(db, sampleEmail('andrew-walsh'));
    expect(await one(`select state from decide_approval($1, 'approved')`, [id])).toEqual({ state: 'approved' });
  });

  it("shows activity only about records the viewer can see", async () => {
    await signInAs(db, sampleEmail('rachel-tan'));
    await db.query('select complete_task($1)', [openTaskOf('hannah-brooks')]);
    await signInAs(db, sampleEmail('daniel-reid'));
    await db.query('select complete_task($1)', [openTaskOf('huong-le')]);
    expect((await log()).map((l) => l.actor_slug)).toEqual(['daniel-reid']);
    await signInAs(db, sampleEmail('thao-nguyen'));
    expect((await log()).map((l) => l.actor_slug)).toEqual(['rachel-tan', 'daniel-reid']);
  });

  it('lets an employee see and change only their own tasks', async () => {
    await signInAs(db, sampleEmail('huong-le'));
    expect(await one('select * from me')).toEqual({ slug: 'huong-le', access: 'employee', department_id: 'sales' });
    const owners = (await db.query<{ slug: string }>('select distinct assignee_slug slug from task_list')).rows;
    expect(owners).toEqual([{ slug: 'huong-le' }]);
    expect(await count('employees')).toBe(SAMPLE_TEAM.employees.length);
    expect(await count('goals')).toBeGreaterThan(0);
    for (const rel of ['deals', 'invoices', 'campaigns', 'shipments', 'products', 'approvals', 'company_figures']) expect(await count(rel)).toBe(0);

    await db.query('select complete_task($1)', [openTaskOf('huong-le')]);
    await db.query(`select assign_task($1, 'Prepare demo kit', '2026-11-19')`, [emp('huong-le')]);
    await expectRefused('select complete_task($1)', [openTaskOf('minh-tran')], /only change your own tasks/);
    await expectRefused(`select assign_task($1, 'x', '2026-11-19')`, [emp('minh-tran')], /only add tasks for yourself/);
    await expectRefused('select delegate_task($1, $2)', [openTaskOf('huong-le'), emp('minh-tran')], /Only managers can delegate/);
    expect((await log()).map((l) => `${l.action} ${l.actor_slug} ${l.assignee_slug}`)).toEqual(['complete huong-le huong-le', 'assign huong-le huong-le']);
  });

  it('refuses approvals to employees', async () => {
    await db.exec('reset role');
    const id = (await one<{ id: string }>('select id from approvals limit 1')).id;
    await signInAs(db, sampleEmail('huong-le'));
    await expectRefused(`select decide_approval($1, 'approved')`, [id], /Only directors/);
  });

  it("shows a manager their employees' own to-dos, and lets them delegate", async () => {
    await signInAs(db, sampleEmail('huong-le'));
    await db.query(`select assign_task($1, 'Prepare demo kit', '2026-11-19')`, [emp('huong-le')]);
    await signInAs(db, sampleEmail('daniel-reid'));
    const t = await one<{ id: string }>(`select id from task_list where title = 'Prepare demo kit'`);
    await db.query('select delegate_task($1, $2)', [t.id, emp('minh-tran')]);
    expect((await log()).map((l) => `${l.action} ${l.actor_slug}`)).toEqual(['assign huong-le', 'delegate daniel-reid']);
  });

  it('blocks direct writes: changes go through the functions', async () => {
    await signInAs(db, sampleEmail('michael-chen'));
    await db.exec('savepoint s');
    // No write policies: updates match no rows; inserts are refused.
    await db.query(`update tasks set title = 'x'`);
    await expect(db.query(`insert into customers (name) values ('x')`)).rejects.toThrow(/row-level security/);
    await db.exec('rollback to savepoint s');
    expect(await count(`tasks where title = 'x'`)).toBe(0);
  });
});
