/**
 * Loads the Supabase migrations and the generated seed into PGlite (Postgres
 * in WebAssembly) and checks that what the database derives matches the
 * sample data the app shows.
 */
import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { revenueThisYear } from '../src/data/metrics';
import { SAMPLE_DATA } from '../src/data/sample';
import { SAMPLE_TEAM } from '../src/data/sampleTeam';
import { workloadByEmployee } from '../src/data/workload';
import { buildSeed } from './seed/buildSeed';
import { renderSeed, SEED_PATH } from './seed/generate';
import { attempt as attemptIn, createSeededDb } from './testDb';

let db: PGlite;
const seed = buildSeed();

const rows = async <T,>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;
const one = async <T,>(sql: string, params: unknown[] = []) => (await rows<T>(sql, params))[0]!;
const num = (v: unknown) => Number(v);

const attempt = (sql: string, params: unknown[] = []) => attemptIn(db, sql, params);

beforeAll(async () => {
  db = await createSeededDb();
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe('seed file', () => {
  it('is up to date with the sample data (run npm run db:seed)', () => {
    expect(readFileSync(SEED_PATH, 'utf8')).toBe(renderSeed());
  });
});

describe('people and tasks', () => {
  it('has every department, person and task', async () => {
    expect(num((await one<{ n: number }>('select count(*) n from departments')).n)).toBe(6);
    expect(num((await one<{ n: number }>('select count(*) n from employees')).n)).toBe(SAMPLE_TEAM.employees.length);
    expect(num((await one<{ n: number }>('select count(*) n from tasks')).n)).toBe(SAMPLE_TEAM.tasks.length);
    expect(num((await one<{ n: number }>('select count(*) n from tasks where linked_id is not null')).n)).toBe(
      SAMPLE_TEAM.tasks.filter((t) => t.linked).length,
    );
  });

  it('derives the same workload for everyone as the app', async () => {
    const app = workloadByEmployee(SAMPLE_TEAM.employees, SAMPLE_TEAM.tasks, SAMPLE_TEAM.today, SAMPLE_TEAM.weekStart);
    const fromDb = await rows<{ slug: string; open: number; doing: number; todo: number; overdue: number; done_this_week: number; state: string }>(
      'select e.slug, w.* from employee_workload w join employees e on e.id = w.employee_id',
    );
    expect(fromDb).toHaveLength(app.size);
    for (const r of fromDb) {
      const w = app.get(r.slug)!;
      expect({ slug: r.slug, open: r.open, doing: r.doing, todo: r.todo, late: r.overdue, done: r.done_this_week, state: r.state }).toEqual({
        slug: r.slug, open: w.open, doing: w.doing, todo: w.todo, late: w.late, done: w.doneThisWeek, state: w.state,
      });
    }
  });

  it('pins "today" for sample data', async () => {
    const r = await one<{ today: string; week: string }>('select app_today()::text today, app_week_start()::text week');
    expect(r).toEqual({ today: SAMPLE_TEAM.today, week: SAMPLE_TEAM.weekStart });
  });
});

describe('derived CRM figures match the prototype', () => {
  it('pipeline by stage', async () => {
    const r = await rows<{ stage: string; deals: number; value: string }>('select stage::text, deals, value from pipeline_by_stage');
    const byStage = new Map(r.map((x) => [x.stage, x]));
    for (const s of SAMPLE_DATA.sales.stages) {
      expect([byStage.get(s.name.toLowerCase())?.deals, num(byStage.get(s.name.toLowerCase())?.value)]).toEqual([s.count, s.value]);
    }
  });

  it('biggest open deals', async () => {
    const r = await rows<{ name: string; value: string }>(
      `select c.name, d.value from deals d join customers c on c.id = d.customer_id
       where d.stage not in ('won', 'lost') order by d.value desc limit 5`,
    );
    expect(r.map((x) => [x.name, num(x.value)])).toEqual(
      [...SAMPLE_DATA.sales.deals].sort((a, b) => b.value - a.value).map((d) => [d.co, d.value]),
    );
  });

  it('won this month and the 90-day win rate', async () => {
    const won = await one<{ n: number; v: string }>(
      `select count(*)::int n, sum(value) v from deals where stage = 'won' and closed_on >= date_trunc('month', app_today())`,
    );
    expect([won.n, num(won.v)]).toEqual([SAMPLE_DATA.sales.won.count, SAMPLE_DATA.sales.won.value]);
    const rate = await one<{ r: string }>(
      `select round(100.0 * count(*) filter (where stage = 'won') / count(*)) r
       from deals where stage in ('won', 'lost') and closed_on > app_today() - 90`,
    );
    expect(num(rate.r)).toBe(SAMPLE_DATA.sales.winRate);
  });

  it('receivables, overdue invoices and the largest open invoices', async () => {
    const r = await one<{ owed: string; overdue: string; n: number }>(
      'select sum(amount) owed, sum(amount) filter (where is_overdue) overdue, (count(*) filter (where is_overdue))::int n from open_invoices',
    );
    const overdue = SAMPLE_DATA.finance.invoices.filter((i) => i.status === 'Overdue');
    expect([num(r.owed), num(r.overdue), r.n]).toEqual([SAMPLE_DATA.finance.receivables, overdue.reduce((a, i) => a + i.amt, 0), overdue.length]);
    const top = await rows<{ number: string }>('select number from open_invoices order by amount desc limit 5');
    expect(top.map((x) => x.number).sort()).toEqual(SAMPLE_DATA.finance.invoices.map((i) => i.no).sort());
  });

  it('revenue this year, cash and Q4 progress', async () => {
    const ytd = await one<{ v: string }>(`select sum(value) v from company_figures where key = 'revenue' and period >= date_trunc('year', app_today())`);
    expect(num(ytd.v)).toBe(revenueThisYear(SAMPLE_DATA.finance));
    const cash = await one<{ v: string }>(`select value v from company_figures where key = 'cash_balance' and period = app_today()`);
    expect(num(cash.v)).toBe(SAMPLE_DATA.finance.cash);
    const q4 = await one<{ pct: string }>(
      `select round(100 * (select sum(value) from company_figures where key = 'revenue' and period >= '2026-10-01') / target_amount) pct
       from goals where metric = 'revenue'`,
    );
    expect(num(q4.pct)).toBe(66);
  });

  it('department status inputs: customs, low stock, approvals, rack space', async () => {
    expect((await rows<{ code: string }>(`select code from shipments where status = 'at_customs'`)).map((s) => s.code)).toEqual(['IMP-1185']);
    expect(num((await one<{ n: number }>('select count(*) n from products where on_hand < reorder_at')).n)).toBe(3);
    expect(num((await one<{ n: number }>(`select count(*) n from approvals where state = 'waiting'`)).n)).toBe(3);
    const zones = await rows<{ code: string; pct: string }>('select code, round(100.0 * slots_used / slots) pct from warehouse_zones order by code');
    expect(zones.map((z) => num(z.pct))).toEqual(SAMPLE_DATA.warehouse.zones.map((z) => z.fill));
  });
});

describe('rules the database enforces', () => {
  const task = () => seed.ids.task(SAMPLE_TEAM.tasks.find((t) => t.assigneeId === 'hannah-brooks' && t.status !== 'done')!.id);

  it('delegates within a department', async () => {
    expect(
      await attempt('update tasks set assignee_id = $1, delegated_from_id = $2 where id = $3', [seed.ids.employee('lan-phan'), seed.ids.employee('hannah-brooks'), task()]),
    ).toBeNull();
  });

  it('refuses delegation to another department', async () => {
    const err = await attempt('update tasks set assignee_id = $1, delegated_from_id = $2 where id = $3', [
      seed.ids.employee('linh-nguyen'), seed.ids.employee('hannah-brooks'), task(),
    ]);
    expect(err?.message).toMatch(/within a department/);
  });

  it('refuses links to records that do not exist', async () => {
    const err = await attempt(`update tasks set linked_type = 'invoice', linked_id = gen_random_uuid() where id = $1`, [task()]);
    expect(err?.message).toMatch(/does not exist/);
  });

  it('requires a time for done tasks and a non-blank title', async () => {
    expect(await attempt(`update tasks set status = 'done' where id = $1`, [task()])).not.toBeNull();
    expect(await attempt(`update tasks set status = 'done', done_at = now() where id = $1`, [task()])).toBeNull();
    expect(await attempt(`update tasks set title = '  ' where id = $1`, [task()])).not.toBeNull();
  });

  it('has row-level security on every table', async () => {
    const r = await rows<{ relname: string }>(
      `select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`,
    );
    expect(r).toEqual([]);
  });
});
