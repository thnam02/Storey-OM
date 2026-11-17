import { isDepartmentId } from '../data/sample';
import type { DepartmentId, Employee } from '../data/types';

export interface Route {
  selectedDeptId: DepartmentId | null;
  selectedEmployeeId: string | null;
}

const OVERVIEW: Route = { selectedDeptId: null, selectedEmployeeId: null };

/** "#sales" opens a department, "#p-linh-nguyen" a person, anything else the overview. */
export function parseHash(hash: string, employees: readonly Pick<Employee, 'id' | 'departmentId'>[]): Route {
  const h = hash.replace(/^#/, '');
  if (h.startsWith('p-')) {
    const e = employees.find((x) => x.id === h.slice(2));
    return e ? { selectedDeptId: e.departmentId, selectedEmployeeId: e.id } : OVERVIEW;
  }
  return isDepartmentId(h) ? { selectedDeptId: h, selectedEmployeeId: null } : OVERVIEW;
}

/** The hash for a selection. A department the viewer can't open keeps its own hash, so the link still explains itself. */
export function toHash(route: Route & { lockedDeptId?: DepartmentId | null }): string {
  if (route.selectedEmployeeId) return `p-${route.selectedEmployeeId}`;
  return route.selectedDeptId ?? route.lockedDeptId ?? 'overview';
}
