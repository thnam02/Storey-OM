import type { Employee, Task } from './types';

export type WorkloadState = 'ok' | 'busy' | 'late';

export interface Workload {
  open: number;
  late: number;
  doing: number;
  todo: number;
  doneThisWeek: number;
  state: WorkloadState;
}

/** Open tasks at or above this count make someone "busy". */
export const BUSY_AT = 6;

export const WORKLOAD_STATE: Record<WorkloadState, { label: string; color: string; tone: 'ok' | 'warn' | 'bad' }> = {
  ok: { label: 'On track', color: '#2e8b57', tone: 'ok' },
  busy: { label: 'Busy', color: '#d99a1e', tone: 'warn' },
  late: { label: 'Has overdue tasks', color: '#c2453b', tone: 'bad' },
};

export const isOverdue = (t: Task, today: string) => t.status !== 'done' && t.dueDate < today;

/**
 * Derived, never stored: any overdue task → late (red); 6+ open → busy (amber);
 * otherwise on track (green).
 */
export function workloadOf(tasks: readonly Task[], today: string, weekStart: string): Workload {
  let open = 0, late = 0, doing = 0, todo = 0, doneThisWeek = 0;
  for (const t of tasks) {
    if (t.status === 'done') {
      if (t.doneAt && t.doneAt >= weekStart) doneThisWeek++;
      continue;
    }
    open++;
    if (t.status === 'doing') doing++;
    else todo++;
    if (t.dueDate < today) late++;
  }
  const state: WorkloadState = late ? 'late' : open >= BUSY_AT ? 'busy' : 'ok';
  return { open, late, doing, todo, doneThisWeek, state };
}

/** Workload for every employee, keyed by employee id. */
export function workloadByEmployee(employees: readonly Employee[], tasks: readonly Task[], today: string, weekStart: string) {
  const byAssignee = new Map<string, Task[]>();
  for (const t of tasks) {
    const list = byAssignee.get(t.assigneeId);
    if (list) list.push(t);
    else byAssignee.set(t.assigneeId, [t]);
  }
  return new Map(employees.map((e) => [e.id, workloadOf(byAssignee.get(e.id) ?? [], today, weekStart)]));
}

/** "Linh Nguyen" → "Linh N." for name tags. */
export function shortName(name: string): string {
  const parts = name.split(' ');
  const last = parts[parts.length - 1] ?? '';
  return parts.length > 1 ? `${parts[0]} ${last[0]}.` : name;
}

/** Ring colour for someone whose workload the viewer can't see (another department). */
export const NO_WORKLOAD_COLOR = '#a9b3ba';

/** Status ring colour: the workload state, or neutral when it isn't known. */
export const ringColor = (w: Workload | undefined) => (w ? WORKLOAD_STATE[w.state].color : NO_WORKLOAD_COLOR);
