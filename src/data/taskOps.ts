/**
 * Changes a manager can make to tasks and approvals. Pure functions that
 * return new data; the data store applies them. Step 5 moves them behind the
 * database (with the activity log).
 */
import type { ApprovalState, CompanyData, Task, TeamData } from './types';

/** Next free id of the form t<number>. */
export function nextTaskId(tasks: readonly Task[]): string {
  let max = 0;
  for (const t of tasks) {
    const n = Number(t.id.slice(1));
    if (t.id.startsWith('t') && Number.isInteger(n) && n > max) max = n;
  }
  return 't' + (max + 1);
}

export interface NewTask {
  assigneeId: string;
  title: string;
  dueDate: string;
  createdById: string | null;
}

/** Add a to-do task for someone. Returns the team unchanged if the title is blank or the person is unknown. */
export function assignTask(team: TeamData, input: NewTask): { team: TeamData; task: Task | null } {
  const title = input.title.trim();
  if (!title || !team.employees.some((e) => e.id === input.assigneeId)) return { team, task: null };
  const task: Task = {
    id: nextTaskId(team.tasks),
    title,
    status: 'todo',
    dueDate: input.dueDate,
    doneAt: null,
    assigneeId: input.assigneeId,
    createdById: input.createdById,
    delegatedFromId: null,
    linked: null,
  };
  return { team: { ...team, tasks: [...team.tasks, task] }, task };
}

/** People a task can be delegated to: everyone else in the assignee's department. */
export function delegateTargets(team: TeamData, task: Task) {
  const from = team.employees.find((e) => e.id === task.assigneeId);
  return from ? team.employees.filter((e) => e.departmentId === from.departmentId && e.id !== from.id) : [];
}

/**
 * Hand an open task to someone in the same department. It restarts as to do
 * and remembers who it came from. Anything else leaves the team unchanged.
 */
export function delegateTask(team: TeamData, taskId: string, toId: string): { team: TeamData; task: Task | null } {
  const task = team.tasks.find((t) => t.id === taskId);
  if (!task || task.status === 'done' || !delegateTargets(team, task).some((e) => e.id === toId)) return { team, task: null };
  const moved: Task = { ...task, assigneeId: toId, status: 'todo', delegatedFromId: task.assigneeId };
  return { team: { ...team, tasks: team.tasks.map((t) => (t.id === taskId ? moved : t)) }, task: moved };
}

/** Approve, decline, or (undo) put an approval back in the queue. */
export function setApprovalState(company: CompanyData, id: string, state: ApprovalState): CompanyData {
  const approvals = company.management.approvals;
  if (!approvals.some((a) => a.id === id && a.state !== state)) return company;
  return {
    ...company,
    management: { ...company.management, approvals: approvals.map((a) => (a.id === id ? { ...a, state } : a)) },
  };
}
