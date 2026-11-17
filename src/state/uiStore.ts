import { create } from 'zustand';
import type { DepartmentId } from '../data/types';

export type DeptTab = 'team' | 'workspace';

/**
 * UI state shared by the 3D layer and the panels. The 3D layer reads this and
 * calls the actions below; it never owns selection itself.
 */
export interface UiState {
  selectedDeptId: DepartmentId | null;
  /** Person whose details are open. Always in `selectedDeptId`. */
  selectedEmployeeId: string | null;
  hoveredDeptId: DepartmentId | null;
  hoveredEmployeeId: string | null;
  /** Tab shown for an open department. Stays put when switching departments. */
  deptTab: DeptTab;
  autoRotate: boolean;
  /** Bumped to ask the camera to fly back to the current view's default. */
  cameraResetTick: number;
  /** Departments the viewer can open; null until the company data has loaded. */
  openable: ReadonlySet<DepartmentId> | null;
  /** A department the viewer tried to open without access; the panel explains. */
  lockedDeptId: DepartmentId | null;

  /**
   * Open a department (or the whole site with null). Closes any open person.
   * A department the viewer cannot open shows the locked notice instead.
   */
  selectDept: (id: DepartmentId | null) => void;
  /** Open a person; their department opens too. */
  selectEmployee: (id: string, deptId: DepartmentId) => void;
  hoverDept: (id: DepartmentId | null) => void;
  hoverEmployee: (id: string | null) => void;
  setDeptTab: (tab: DeptTab) => void;
  toggleAutoRotate: () => void;
  resetCamera: () => void;
  /** Which departments can be opened. Closes the open one if it is no longer allowed. */
  setOpenable: (ids: readonly DepartmentId[]) => void;
}

const blocked = (s: UiState, id: DepartmentId | null) => id !== null && s.openable !== null && !s.openable.has(id);
const showLocked = (id: DepartmentId) => ({ lockedDeptId: id, selectedDeptId: null, selectedEmployeeId: null, hoveredEmployeeId: null });

export const useUiStore = create<UiState>()((set) => ({
  selectedDeptId: null,
  selectedEmployeeId: null,
  hoveredDeptId: null,
  hoveredEmployeeId: null,
  deptTab: 'team',
  autoRotate: false,
  cameraResetTick: 0,
  openable: null,
  lockedDeptId: null,

  selectDept: (id) =>
    set((s) => {
      if (blocked(s, id)) return showLocked(id!);
      if (s.selectedDeptId === id && !s.selectedEmployeeId && !s.lockedDeptId) return s;
      return { selectedDeptId: id, selectedEmployeeId: null, hoveredEmployeeId: null, lockedDeptId: null };
    }),
  selectEmployee: (id, deptId) =>
    set((s) => {
      if (blocked(s, deptId)) return showLocked(deptId);
      return s.selectedEmployeeId === id ? s : { selectedDeptId: deptId, selectedEmployeeId: id, lockedDeptId: null };
    }),
  hoverDept: (id) => set((s) => (s.hoveredDeptId === id ? s : { hoveredDeptId: id })),
  hoverEmployee: (id) => set((s) => (s.hoveredEmployeeId === id ? s : { hoveredEmployeeId: id })),
  setDeptTab: (tab) => set({ deptTab: tab }),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  resetCamera: () => set((s) => ({ cameraResetTick: s.cameraResetTick + 1 })),
  setOpenable: (ids) =>
    set((s) => {
      const openable = new Set(ids);
      if (s.selectedDeptId && !openable.has(s.selectedDeptId)) return { openable, ...showLocked(s.selectedDeptId) };
      // Access granted (another viewer in the sample): open what was locked.
      if (s.lockedDeptId && openable.has(s.lockedDeptId)) return { openable, lockedDeptId: null, selectedDeptId: s.lockedDeptId };
      return { openable };
    }),
}));
