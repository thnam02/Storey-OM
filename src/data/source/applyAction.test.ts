import { describe, expect, it } from 'vitest';
import { describeActivity } from '../activity';
import { SAMPLE_DATA } from '../sample';
import { SAMPLE_TEAM, SAMPLE_VIEWER_ID } from '../sampleTeam';
import { workloadOf } from '../workload';
import { applyAction } from './applyAction';
import { createDataSource } from './index';
import { createSampleSource } from './sampleSource';
import type { Snapshot } from './types';

const base: Snapshot = { company: SAMPLE_DATA, team: SAMPLE_TEAM, viewerId: SAMPLE_VIEWER_ID, isSample: true, timezone: 'Australia/Sydney', activity: [] };
const ctx = { at: '2026-11-17T14:05', entryId: 'e1' };
const names = new Map(SAMPLE_TEAM.employees.map((e) => [e.id, e.name]));
const say = (s: Snapshot) => s.activity.map((e) => describeActivity(e, (id) => names.get(id) ?? id, s.viewerId));
const load = (s: Snapshot, id: string) => workloadOf(s.team.tasks.filter((t) => t.assigneeId === id), s.team.today, s.team.weekStart);
const hannahsOverdue = SAMPLE_TEAM.tasks.find((t) => t.assigneeId === 'hannah-brooks' && t.linked?.id === 'INV-2041')!;

describe('applyAction', () => {
  it('assigns and logs', () => {
    const s = applyAction(base, { type: 'assign', assigneeId: 'huong-le', title: 'Call Lotus Grocers', dueDate: '2026-11-18' }, ctx);
    expect(load(s, 'huong-le').open).toBe(load(base, 'huong-le').open + 1);
    expect(say(s)).toEqual(['You assigned “Call Lotus Grocers” to Huong Le.']);
    expect(s.activity[0]).toMatchObject({ id: 'e1', at: '2026-11-17T14:05', actorId: SAMPLE_VIEWER_ID });
  });

  it('delegates within the department and refuses otherwise', () => {
    const s = applyAction(base, { type: 'delegate', taskId: hannahsOverdue.id, toId: 'lan-phan' }, ctx);
    expect(say(s)).toEqual(['You delegated “Chase payment from Harbourline Retail” from Hannah Brooks to Lan Phan.']);
    expect(() => applyAction(base, { type: 'delegate', taskId: hannahsOverdue.id, toId: 'linh-nguyen' }, ctx)).toThrow(/within a department/);
    expect(() => applyAction(base, { type: 'delegate', taskId: hannahsOverdue.id, toId: 'hannah-brooks' }, ctx)).toThrow(/already/);
  });

  it('marks done on the app day, then reopens; repeating changes nothing', () => {
    const done = applyAction(base, { type: 'complete', taskId: hannahsOverdue.id }, ctx);
    expect(done.team.tasks.find((t) => t.id === hannahsOverdue.id)).toMatchObject({ status: 'done', doneAt: '2026-11-17' });
    expect(load(done, 'hannah-brooks')).toMatchObject({ late: load(base, 'hannah-brooks').late - 1, doneThisWeek: load(base, 'hannah-brooks').doneThisWeek + 1 });
    expect(applyAction(done, { type: 'complete', taskId: hannahsOverdue.id }, ctx)).toBe(done);
    const reopened = applyAction(done, { type: 'reopen', taskId: hannahsOverdue.id }, { ...ctx, entryId: 'e2' });
    expect(reopened.team.tasks.find((t) => t.id === hannahsOverdue.id)).toMatchObject({ status: 'todo', doneAt: null });
    expect(say(reopened)).toEqual([
      'You reopened “Chase payment from Harbourline Retail” for Hannah Brooks.',
      'You marked “Chase payment from Harbourline Retail” done for Hannah Brooks.',
    ]);
  });

  it('decides approvals and logs undo', () => {
    const s = applyAction(base, { type: 'decide', approvalId: 'a2', state: 'approved' }, ctx);
    expect(s.company.management.approvals.find((a) => a.id === 'a2')?.state).toBe('approved');
    const undone = applyAction(s, { type: 'decide', approvalId: 'a2', state: 'waiting' }, ctx);
    expect(say(undone)[0]).toBe('You put “Raise December ad budget by A$5,000” back in the approval queue.');
  });

  it('refuses changes when nobody is signed in', () => {
    expect(() => applyAction({ ...base, viewerId: null }, { type: 'complete', taskId: hannahsOverdue.id }, ctx)).toThrow(/Sign in/);
  });
});

describe('data sources', () => {
  it('uses the sample company unless Supabase is configured', () => {
    expect(createDataSource({}).kind).toBe('sample');
    expect(createDataSource({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_KEY: '  ' }).kind).toBe('sample');
    expect(createDataSource({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_KEY: 'key' }).kind).toBe('supabase');
  });

  it('keeps sample changes until reload and rejects refused ones', async () => {
    const src = createSampleSource();
    await src.perform({ type: 'complete', taskId: hannahsOverdue.id });
    const s = await src.load();
    expect(s.team.tasks.find((t) => t.id === hannahsOverdue.id)?.status).toBe('done');
    expect(s.activity).toHaveLength(1);
    await expect(src.perform({ type: 'delegate', taskId: hannahsOverdue.id, toId: 'lan-phan' })).rejects.toThrow(/Only open tasks/);
  });
});
