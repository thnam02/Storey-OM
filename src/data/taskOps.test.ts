import { describe, expect, it } from 'vitest';
import { SAMPLE_DATA } from './sample';
import { SAMPLE_TEAM } from './sampleTeam';
import { assignTask, delegateTargets, delegateTask, nextTaskId, setApprovalState } from './taskOps';
import { workloadOf } from './workload';

const team = SAMPLE_TEAM;
const tasksOf = (id: string, t = team) => t.tasks.filter((x) => x.assigneeId === id);
const load = (id: string, t = team) => workloadOf(tasksOf(id, t), t.today, t.weekStart);

describe('assignTask', () => {
  it('adds a to-do task with a fresh id', () => {
    const { team: next, task } = assignTask(team, { assigneeId: 'huong-le', title: '  Call Lotus Grocers ', dueDate: '2026-11-18', createdById: 'michael-chen' });
    expect(task).toMatchObject({ title: 'Call Lotus Grocers', status: 'todo', assigneeId: 'huong-le', createdById: 'michael-chen', id: nextTaskId(team.tasks) });
    expect(next.tasks).toHaveLength(team.tasks.length + 1);
    expect(load('huong-le', next).open).toBe(load('huong-le').open + 1);
    expect(next.employees).toBe(team.employees); // seating is not recomputed
  });

  it('ignores blank titles and unknown people', () => {
    expect(assignTask(team, { assigneeId: 'huong-le', title: '   ', dueDate: team.today, createdById: null }).team).toBe(team);
    expect(assignTask(team, { assigneeId: 'nobody', title: 'x', dueDate: team.today, createdById: null }).team).toBe(team);
  });

  it('can make someone late', () => {
    const { team: next } = assignTask(team, { assigneeId: 'huong-le', title: 'Old thing', dueDate: '2026-11-10', createdById: null });
    expect(load('huong-le', next).state).toBe('late');
  });
});

describe('delegateTask', () => {
  const overdue = team.tasks.find((t) => t.assigneeId === 'hannah-brooks' && t.linked?.id === 'INV-2041')!;

  it('only offers people in the same department', () => {
    const targets = delegateTargets(team, overdue);
    expect(targets.length).toBe(5);
    expect(targets.every((e) => e.departmentId === 'finance' && e.id !== 'hannah-brooks')).toBe(true);
  });

  it('moves the task, restarts it as to do and records who it came from', () => {
    const { team: next, task } = delegateTask(team, overdue.id, 'lan-phan');
    expect(task).toMatchObject({ assigneeId: 'lan-phan', status: 'todo', delegatedFromId: 'hannah-brooks', linked: overdue.linked });
    expect(tasksOf('hannah-brooks', next)).toHaveLength(tasksOf('hannah-brooks').length - 1);
    expect(load('lan-phan', next).late).toBe(load('lan-phan').late + 1);
  });

  it('refuses other departments, done tasks and unknown tasks', () => {
    expect(delegateTask(team, overdue.id, 'linh-nguyen').team).toBe(team);
    const done = team.tasks.find((t) => t.status === 'done')!;
    const mate = delegateTargets(team, done)[0]!;
    expect(delegateTask(team, done.id, mate.id).team).toBe(team);
    expect(delegateTask(team, 'nope', 'lan-phan').team).toBe(team);
  });
});

describe('setApprovalState', () => {
  it('approves, then undoes', () => {
    const approved = setApprovalState(SAMPLE_DATA, 'a1', 'approved');
    expect(approved.management.approvals.find((a) => a.id === 'a1')?.state).toBe('approved');
    expect(SAMPLE_DATA.management.approvals.find((a) => a.id === 'a1')?.state).toBe('waiting');
    expect(setApprovalState(approved, 'a1', 'waiting').management.approvals.find((a) => a.id === 'a1')?.state).toBe('waiting');
  });

  it('returns the same data when nothing changes', () => {
    expect(setApprovalState(SAMPLE_DATA, 'a1', 'waiting')).toBe(SAMPLE_DATA);
    expect(setApprovalState(SAMPLE_DATA, 'zz', 'approved')).toBe(SAMPLE_DATA);
  });
});
