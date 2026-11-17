import { create } from 'zustand';
import type { DepartmentId } from '../data/types';

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
  autoRotate: boolean;
  /** Bumped to ask the camera to fly back to the current view's default. */
  cameraResetTick: number;

  /** Open a department (or the whole site with null). Closes any open person. */
  selectDept: (id: DepartmentId | null) => void;
  /** Open a person; their department opens too. */
  selectEmployee: (id: string, deptId: DepartmentId) => void;
  hoverDept: (id: DepartmentId | null) => void;
  hoverEmployee: (id: string | null) => void;
  toggleAutoRotate: () => void;
  resetCamera: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  selectedDeptId: null,
  selectedEmployeeId: null,
  hoveredDeptId: null,
  hoveredEmployeeId: null,
  autoRotate: false,
  cameraResetTick: 0,

  selectDept: (id) =>
    set((s) => (s.selectedDeptId === id && !s.selectedEmployeeId ? s : { selectedDeptId: id, selectedEmployeeId: null, hoveredEmployeeId: null })),
  selectEmployee: (id, deptId) =>
    set((s) => (s.selectedEmployeeId === id ? s : { selectedDeptId: deptId, selectedEmployeeId: id })),
  hoverDept: (id) => set((s) => (s.hoveredDeptId === id ? s : { hoveredDeptId: id })),
  hoverEmployee: (id) => set((s) => (s.hoveredEmployeeId === id ? s : { hoveredEmployeeId: id })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  resetCamera: () => set((s) => ({ cameraResetTick: s.cameraResetTick + 1 })),
}));
