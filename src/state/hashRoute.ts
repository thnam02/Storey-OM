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

export function toHash(route: Route): string {
  if (route.selectedEmployeeId) return `p-${route.selectedEmployeeId}`;
  return route.selectedDeptId ?? 'overview';
}
