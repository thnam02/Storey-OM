/**
 * Who sees what. Mirrors the database's row-level security
 * (supabase/migrations/*_auth_and_roles.sql): a director sees every
 * department, a manager their own. The staff directory and company goals are
 * open to both; tasks, activity and each department's records are not.
 * Import & Export and the Warehouse share shipments and stock.
 */
import { DEPARTMENTS } from './sample';
import type { Snapshot } from './source/types';
import { EMPTY_COMPANY } from './source/rows';
import type { AppRole, DepartmentId, Employee } from './types';

/** The person using the app. */
export interface Viewer {
  id: string;
  role: AppRole;
  departmentId: DepartmentId;
}

const ALL = DEPARTMENTS.map((d) => d.id);

/** The viewer for an employee, if they have app access. */
export function viewerOf(employees: readonly Employee[], id: string | null): Viewer | null {
  const e = id ? employees.find((x) => x.id === id) : undefined;
  return e?.access ? { id: e.id, role: e.access, departmentId: e.departmentId } : null;
}

export function visibleDepartments(viewer: Viewer | null): DepartmentId[] {
  if (!viewer) return [];
  return viewer.role === 'director' ? ALL : [viewer.departmentId];
}

/** Whether the viewer can open a department: its team, tasks and workspace. */
export const canSee = (viewer: Viewer | null, dept: DepartmentId) =>
  !!viewer && (viewer.role === 'director' || viewer.departmentId === dept);

const seesAny = (viewer: Viewer | null, depts: readonly DepartmentId[]) => depts.some((d) => canSee(viewer, d));

export const canDecideApprovals = (viewer: Viewer | null) => viewer?.role === 'director';

export const ROLE_LABEL: Record<AppRole, string> = { director: 'Director', manager: 'Manager' };

/**
 * What the viewer is allowed to see of the whole company: the same rows the
 * database returns to them. Used by the sample data source.
 */
export function scopeSnapshot(full: Snapshot): Snapshot {
  const v = full.viewer;
  if (!v) {
    return { ...full, company: EMPTY_COMPANY, team: { ...full.team, employees: [], tasks: [] }, activity: [] };
  }
  const c = full.company;
  const deptOf = new Map(full.team.employees.map((e) => [e.id, e.departmentId]));
  const tasks = full.team.tasks.filter((t) => canSee(v, deptOf.get(t.assigneeId)!));
  const approvals = c.management.approvals.filter((a) => seesAny(v, ['management', a.from]));
  const taskIds = new Set(tasks.map((t) => t.id));
  const approvalIds = new Set(approvals.map((a) => a.id));
  const sharedStock: DepartmentId[] = ['import-export', 'warehouse'];

  return {
    ...full,
    company: {
      sales: canSee(v, 'sales') ? c.sales : EMPTY_COMPANY.sales,
      marketing: canSee(v, 'marketing') ? c.marketing : EMPTY_COMPANY.marketing,
      finance: canSee(v, 'finance') ? c.finance : EMPTY_COMPANY.finance,
      management: { ...c.management, margin: canSee(v, 'management') ? c.management.margin : 0, approvals },
      importExport: seesAny(v, sharedStock) ? c.importExport : EMPTY_COMPANY.importExport,
      warehouse: seesAny(v, sharedStock) ? c.warehouse : EMPTY_COMPANY.warehouse,
    },
    team: { ...full.team, tasks },
    activity: full.activity.filter((e) => (e.entity === 'task' ? taskIds.has(e.entityId) : approvalIds.has(e.entityId))),
  };
}
