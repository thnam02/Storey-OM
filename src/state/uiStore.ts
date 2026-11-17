import { create } from 'zustand';
import { isDepartmentId } from '../data/sample';
import type { DepartmentId } from '../data/types';

/** Department named in the URL hash (#sales), if any. */
export function deptFromHash(): DepartmentId | null {
  if (typeof window === 'undefined') return null;
  const h = window.location.hash.slice(1);
  return isDepartmentId(h) ? h : null;
}

/**
 * UI state shared by the 3D layer and the panels. The 3D layer reads this and
 * calls the actions below; it never owns selection itself.
 */
export interface UiState {
  selectedDeptId: DepartmentId | null;
  hoveredDeptId: DepartmentId | null;
  autoRotate: boolean;
  /** Bumped to ask the camera to fly back to the current view's default. */
  cameraResetTick: number;

  selectDept: (id: DepartmentId | null) => void;
  hoverDept: (id: DepartmentId | null) => void;
  toggleAutoRotate: () => void;
  resetCamera: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  // Read the hash up front so a deep link opens without a camera fly-in.
  selectedDeptId: deptFromHash(),
  hoveredDeptId: null,
  autoRotate: false,
  cameraResetTick: 0,

  selectDept: (id) => set((s) => (s.selectedDeptId === id ? s : { selectedDeptId: id })),
  hoverDept: (id) => set((s) => (s.hoveredDeptId === id ? s : { hoveredDeptId: id })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  resetCamera: () => set((s) => ({ cameraResetTick: s.cameraResetTick + 1 })),
}));
