import { useEffect } from 'react';
import type { Employee } from '../data/types';
import { parseHash, toHash } from './hashRoute';
import { useUiStore } from './uiStore';

/** Apply the URL hash before the first render, so a deep link opens without a camera fly-in. */
export function applyInitialHash(employees: readonly Employee[]) {
  useUiStore.setState(parseHash(window.location.hash, employees));
}

/** Keeps the selection in the URL hash (#sales, #p-linh-nguyen), like the prototype. */
export function useHashSync(employees: readonly Employee[]) {
  useEffect(() => {
    const onHash = () => {
      const route = parseHash(window.location.hash, employees);
      const s = useUiStore.getState();
      if (route.selectedEmployeeId && route.selectedDeptId) s.selectEmployee(route.selectedEmployeeId, route.selectedDeptId);
      else s.selectDept(route.selectedDeptId);
    };
    window.addEventListener('hashchange', onHash);

    const unsubscribe = useUiStore.subscribe((s, prev) => {
      if (s.selectedDeptId === prev.selectedDeptId && s.selectedEmployeeId === prev.selectedEmployeeId && s.lockedDeptId === prev.lockedDeptId) return;
      const next = toHash(s);
      if (window.location.hash.slice(1) !== next) window.location.hash = next;
    });

    return () => {
      window.removeEventListener('hashchange', onHash);
      unsubscribe();
    };
  }, [employees]);
}
